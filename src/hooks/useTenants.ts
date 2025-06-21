
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import type { Database } from "@/integrations/supabase/types";


type Tenant = Database['public']['Tables']['tenants']['Row'] & {
    current_room?: {
    id: string;
    room_number: string;
    room_type: string;
    floor: number;
  } | null;
};
type TenantInsert = Database['public']['Tables']['tenants']['Insert']& {
   id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  created_at?: string;
};
type TenantUpdate = Database['public']['Tables']['tenants']['Update'];

type RoomUpdate = Database['public']['Tables']['rooms']['Update']& {
   tenant_id?: string;
};

export const useTenants = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user , session} = useAuth();

  const {
    data: tenants = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      console.log('Fetching tenants...');
      
      // First get all tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantsError) {
        console.error('Error fetching tenants:', tenantsError);
        throw tenantsError;
      }

      console.log('Tenants fetched:', tenantsData);

      // Then get current occupancy with room details for each tenant
      const tenantsWithRooms = await Promise.all(
        (tenantsData || []).map(async (tenant) => {
          const { data: occupancyData } = await supabase
            .from('occupancy')
            .select(`
              room_id,
              rooms!occupancy_room_id_fkey(
                id,
                room_number,
                room_type,
                floor
              )
            `)
            .eq('tenant_id', tenant.id)
            .eq('is_current', true)
            .maybeSingle();

          const current_room = occupancyData?.rooms ? {
            id: occupancyData.rooms.id,
            room_number: occupancyData.rooms.room_number,
            room_type: occupancyData.rooms.room_type,
            floor: occupancyData.rooms.floor,
          } : null;

          return {
            ...tenant,
            current_room
          };
        })
      );

      console.log('Tenants with room info:', tenantsWithRooms);
      return tenantsWithRooms;
    },
    enabled: !!user,
  });

  const createTenantMutation = useMutation({
      mutationFn: async (newTenant: TenantInsert) => {
        console.log('Creating tenant with:', newTenant);

        const { data, error } = await supabase
          .from('tenants')
          .insert({
            first_name: newTenant.first_name,
            last_name: newTenant.last_name,
            email: newTenant.email,
            phone: newTenant.phone,
            address: newTenant.address,
            emergency_contact: newTenant.emergency_contact || '',
            room_number: newTenant.room_number || 'NULL' 
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating tenant:', error);
          throw error;
        }

        return data;
      },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: "สำเร็จ",
        description: "เพิ่มผู้เช่าใหม่เรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error('Create tenant error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มผู้เช่าได้",
        variant: "destructive",
      });
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TenantUpdate }) => {
      console.log('Updating tenant:', id, updates);
      const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating tenant:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: "สำเร็จ",
        description: "อัปเดตข้อมูลผู้เช่าเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error('Update tenant error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตข้อมูลผู้เช่าได้",
        variant: "destructive",
      });
    },
  });

      const deleteTenantMutation = useMutation({
        mutationFn: async (tenantId: string) => {
          // 1. หา user id จาก profiles
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('tenant_id', tenantId)
            .single();
         console.log('tenantId ที่จะส่งไปลบ:', tenantId);
          if (profileError || !profile) {
            throw new Error('ไม่พบ user id ที่ตรงกับ tenant นี้');
          }

          const userId = profile.id;
          console.log('userId ที่จะส่งไปลบ:', userId);


          const { error: updateProfileError } = await supabase
                .from('profiles')
                .update({ tenant_id: null , staff_id: null, })
                .eq('id', userId);
          
              if (updateProfileError) {
                throw new Error('ไม่สามารถลบความสัมพันธ์กับ tenant ใน profiles ได้');
              }

          const { error: updateRoomError } = await supabase
              .from('rooms')
              .update({ tenant_id: null, status: 'vacant' })
              .eq('tenant_id', tenantId);

              if (updateRoomError) {
                throw new Error('ไม่สามารถลบความสัมพันธ์กับ tenant ใน rooms ได้');
              }

          // 2. ลบ tenant ใน table
          const { error } = await supabase
            .from('tenants')
            .delete()
            .eq('id', tenantId);

          if (error) {
            throw error;
          }

          // 3. เรียก API ลบ user ใน Auth
          const resp = await fetch(
        "https://mnsotnlftoumjwjlvzus.functions.supabase.co/manage-auth-users",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uc290bmxmdG91bWp3amx2enVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTI4NTYsImV4cCI6MjA2MzU4ODg1Nn0.8r2EP-08imfAL2EFVIgfCHu5lMs2ILJYGds8vs5LC98",
          },
          body: JSON.stringify({ user_ids: [userId] }),
        });

            if (!resp.ok) {
              const data = await resp.json()
              throw new Error(data.error || 'Failed to delete user')
            }
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['tenants'] });
          toast({
            title: "สำเร็จ",
            description: "ลบผู้เช่าและบัญชีผู้ใช้เรียบร้อยแล้ว",
          });
        },
        onError: (error) => {
          console.error('Delete tenant error:', error);
          toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถลบผู้เช่าหรือบัญชีผู้ใช้ได้",
            variant: "destructive",
          });
        },
      });

 const assignRoomMutation = useMutation({
  mutationFn: async ({ tenantId, roomId }: { tenantId: string; roomId: string }) => {
    console.log('Assigning room:', { tenantId, roomId });
    
    // 1. ดึงข้อมูลห้อง
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('capacity, room_number')
      .eq('id', roomId)
      .single();

    if (roomError) {
      console.error('Error fetching room:', roomError);
      throw roomError;
    }

    // 2. ดึงข้อมูลผู้เช่าที่อยู่ในห้องนี้แล้ว
    const { data: currentOccupancy, error: occupancyError } = await supabase
      .from('occupancy')
      .select('tenant_id')
      .eq('room_id', roomId)
      .eq('is_current', true);

    if (occupancyError) {
      console.error('Error fetching current occupancy:', occupancyError);
      throw occupancyError;
    }

    const currentOccupants = currentOccupancy?.length || 0;
    if (currentOccupants >= roomData.capacity) {
      throw new Error('ห้องนี้เต็มแล้ว ไม่สามารถเพิ่มผู้เช่าได้');
    }

    // 3. เช็คเอาต์ออกจากห้องปัจจุบัน (ถ้ามี)
    await supabase
      .from('occupancy')
      .update({ 
        is_current: false, 
        check_out_date: new Date().toISOString().split('T')[0] 
      })
      .eq('tenant_id', tenantId)
      .eq('is_current', true);

    // 4. เช็คอินห้องใหม่
    const { data, error } = await supabase
      .from('occupancy')
      .insert({
        tenant_id: tenantId,
        room_id: roomId,
        check_in_date: new Date().toISOString().split('T')[0],
        is_current: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error assigning room:', error);
      throw error;
    }

  // 5. อัปเดตข้อมูล tenant ในตาราง tenants
  const { error: updateTenantError } = await supabase
    .from('tenants')
    .update({ room_number: roomData.room_number }) 
    .eq('id', tenantId);

  if (updateTenantError) {
    console.error('Error updating tenant with room info:', updateTenantError);
    throw updateTenantError;
  }

  // 6. อัปเดต tenant_id ในตาราง rooms (ห้องใหม่)
  const { error: updateRoomTenantError } = await supabase
    .from('rooms')
    .update <RoomUpdate>({ tenant_id: tenantId })
    .eq('id', roomId);

  if (updateRoomTenantError) {
    console.error('Error updating room with tenant_id:', updateRoomTenantError);
    throw updateRoomTenantError;
  }

  // 6.1 อัปเดต tenant_id ของห้องเก่าให้เป็น NULL
  // หา occupancy ล่าสุดที่ tenant เคยอยู่ (แต่ไม่ใช่ห้องใหม่)
  // 6.1 อัปเดต tenant_id ของห้องเก่าให้เป็น NULL ทั้งหมด (ยกเว้นห้องใหม่)
const { data: oldOccupancies } = await supabase
  .from('occupancy')
  .select('room_id')
  .eq('tenant_id', tenantId)
  .eq('is_current', false);

if (oldOccupancies && Array.isArray(oldOccupancies)) {
  // ลบ tenant_id ออกจากทุกห้องเก่าที่ไม่ใช่ห้องใหม่
  for (const occ of oldOccupancies) {
    if (occ.room_id && occ.room_id !== roomId) {
      await supabase
        .from('rooms')
        .update<RoomUpdate>({ tenant_id: null })
        .eq('id', occ.room_id);
    }
  }
}

  // 7. อัปเดตสถานะห้อง (ถ้าจำเป็น)
  if (currentOccupants === 0) {
    await supabase
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', roomId);
  }

  return data;
  },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['available-rooms-with-capacity'] });
      queryClient.invalidateQueries({ queryKey: ['system-stats'] });
      toast({
        title: "สำเร็จ",
        description: "กำหนดห้องให้ผู้เช่าเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error('Assign room error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถกำหนดห้องได้",
        variant: "destructive",
      });
    },
  });

  return {
    tenants,
    isLoading,
    error,
    createTenant: createTenantMutation.mutate,
    updateTenant: updateTenantMutation.mutate,
    deleteTenant: deleteTenantMutation.mutate,
    assignRoom: (tenantId: string, roomId: string) => assignRoomMutation.mutate({ tenantId, roomId }),
    isCreating: createTenantMutation.isPending,
    isUpdating: updateTenantMutation.isPending,
    isDeleting: deleteTenantMutation.isPending,
    isAssigningRoom: assignRoomMutation.isPending,
  };
};
