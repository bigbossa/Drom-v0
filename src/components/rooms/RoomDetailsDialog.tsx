
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DoorClosed, Users, MapPin, Banknote, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type Room = {
  id: string;
  room_number: string;
  room_type: string;
  status: string;
  price: number;
  capacity: number;
  floor: number;
};

type Tenant = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
};

interface RoomDetailsDialogProps {
  room: Room;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RoomDetailsDialog({ room, open, onOpenChange }: RoomDetailsDialogProps) {
  const [currentTenants, setCurrentTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && room.id) {
      fetchCurrentTenants();
    }
  }, [open, room.id]);

  const fetchCurrentTenants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('occupancy')
        .select(`
          tenants!occupancy_tenant_id_fkey(
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('room_id', room.id)
        .eq('is_current', true);

      if (error) {
        console.error('Error fetching current tenants:', error);
        return;
      }

      // Extract tenants from the nested structure
      const tenants = data?.map(occupancy => occupancy.tenants).filter(Boolean) || [];
      setCurrentTenants(tenants);
    } catch (err) {
      console.error('Error in fetchCurrentTenants:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "vacant":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "occupied":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorClosed className="h-5 w-5" />
            ห้อง {room.room_number} รายละเอียด
          </DialogTitle>
          <DialogDescription>
            ข้อมูลทั้งหมดของห้องนี้
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">สถานะ</span>
            <Badge className={`capitalize ${getStatusColor(room.status)}`}>
              {room.status === 'vacant' ? 'ว่าง' : room.status === 'occupied' ? 'มีผู้เช่า' : 'ซ่อมแซม'}
            </Badge>
          </div>

          {/* Room Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">ประเภทห้อง</span>
            <span className="text-sm font-medium">{room.room_type}</span>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              ค่าเช่ารายเดือน
            </span>
            <span className="text-sm font-bold text-green-600">{formatPrice(room.price)}</span>
          </div>

          {/* Capacity */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              จำนวนที่นั่ง
            </span>
            <span className="text-sm font-medium">{room.capacity} คน</span>
          </div>

          {/* Floor */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              ชั้น
            </span>
            <span className="text-sm font-medium">{room.floor}</span>
          </div>

          {/* Current Tenants */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">ผู้เช่าปัจจุบัน</span>
            </div>
            
            {loading ? (
              <div className="text-sm text-muted-foreground">กำลังโหลด...</div>
            ) : currentTenants.length > 0 ? (
              <div className="space-y-2">
                {currentTenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${tenant.first_name} ${tenant.last_name}`} 
                        alt={`${tenant.first_name} ${tenant.last_name}`} 
                      />
                      <AvatarFallback className="text-xs">
                        {tenant.first_name.charAt(0)}{tenant.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tenant.first_name} {tenant.last_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {tenant.email || tenant.phone || '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">ไม่มีผู้เช่าในปัจจุบัน</div>
            )}
          </div>

          {/* Room ID */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">รหัสห้อง</span>
              <span className="text-xs font-mono text-muted-foreground">{room.id}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
