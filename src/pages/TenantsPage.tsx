import { useState, useEffect } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Plus, MoreHorizontal, Eye, Edit, Trash2, Home, UserPlus } from "lucide-react";
import { useTenants } from "@/hooks/useTenants";
import TenantFormDialog from "@/components/tenants/TenantFormDialog";
import TenantDetailsDialog from "@/components/tenants/TenantDetailsDialog";
import RoomAssignmentDialog from "@/components/tenants/RoomAssignmentDialog";
import type { Database } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserCreateDialog } from "../components/auth/UserCreateDialog";
import { PasswordResetDialog } from "../components/auth/PasswordResetDialog";

type Tenant = Database['public']['Tables']['tenants']['Row'] & {
  current_room?: {
  id: string;
  room_number: string;
  room_type: string;
  floor: number;
  } | null;
};

interface UserManagementDialogProps {
  children: React.ReactNode;
}

const TenantsPage = ({ children }: UserManagementDialogProps) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRoomAssignOpen, setIsRoomAssignOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);


  const {
    tenants,
    isLoading,
    createTenant,
    updateTenant,
    deleteTenant,
    assignRoom,
    isCreating,
    isUpdating,
    isDeleting,
    isAssigningRoom,
  } = useTenants();

  const filteredTenants = tenants.filter(tenant => {
    const fullName = `${tenant.first_name} ${tenant.last_name}`.toLowerCase();
    const email = tenant.email?.toLowerCase() || "";
    const phone = tenant.phone?.toLowerCase() || "";
    const roomNumber = tenant.current_room?.room_number?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    
    return fullName.includes(search) || 
           email.includes(search) || 
           phone.includes(search) ||
           roomNumber.includes(search);
  });

  const handleAddTenant = () => {
    setEditingTenant(null);
    setIsFormOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsFormOpen(true);
  };

  const handleViewDetails = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDetailsOpen(true);
  };

  const handleAssignRoom = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsRoomAssignOpen(true);
  };

  const handleDeleteTenant = (tenant: Tenant) => {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบ ${tenant.first_name} ${tenant.last_name}?`)) {
      deleteTenant(tenant.id);
    }
  };

  const handleFormSubmit = (data: Database['public']['Tables']['tenants']['Insert']) => {
    if (editingTenant) {
      updateTenant({ id: editingTenant.id, updates: data });
    } else {
      createTenant(data);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
     <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>จัดการผู้ใช้ระบบ</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* User Create Dialog */}
      <UserCreateDialog
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
        onSuccess={() => {
          // Refresh data if needed
        }}
      />
      
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">จัดการผู้เช่า</h1>
          <p className="text-muted-foreground">จัดการข้อมูลผู้เช่าและห้องที่เช่าในอพาร์ตเมนต์</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button  onClick={() => {
                setIsOpen(false);
                setCreateUserOpen(true);
              }}
               className="flex items-center gap-2">
            <Plus size={16} />
            เพิ่มผู้เช่าใหม่
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>ค้นหาผู้เช่า</CardTitle>
          <CardDescription>
            ค้นหาผู้เช่าด้วยชื่อ อีเมล เบอร์โทร หรือหมายเลขห้อง
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input 
            placeholder="ค้นหาผู้เช่า..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>รายชื่อผู้เช่า</CardTitle>
          <CardDescription>
            แสดง {filteredTenants.length} จาก {tenants.length} รายการ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ผู้เช่า</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>ห้องที่เช่า</TableHead>
                  <TableHead>ที่อยู่</TableHead>
                  <TableHead>วันที่เพิ่ม</TableHead>
                  <TableHead className="w-[100px]">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">ไม่มีข้อมูลผู้เช่า</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTenants.map((tenant) => {
                    const fullName = `${tenant.first_name} ${tenant.last_name}`;
                    return (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage 
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName}`} 
                                alt={fullName} 
                              />
                              <AvatarFallback>
                                {tenant.first_name.charAt(0)}{tenant.last_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{fullName}</p>
                              <p className="text-sm text-muted-foreground">{tenant.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{tenant.phone || "-"}</TableCell>
                        <TableCell>
                          {tenant.current_room ? (
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <Badge variant="secondary" className="text-xs">
                                  ห้อง {tenant.current_room.room_number}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {tenant.current_room.room_type} • ชั้น {tenant.current_room.floor}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">ไม่ได้เช่าห้อง</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {tenant.address || "-"}
                        </TableCell>
                        <TableCell>
                          {new Date(tenant.created_at!).toLocaleDateString('th-TH')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(tenant)}>
                                <Eye className="mr-2 h-4 w-4" />
                                ดูรายละเอียด
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAssignRoom(tenant)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                กำหนดห้อง
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditTenant(tenant)}>
                                <Edit className="mr-2 h-4 w-4" />
                                แก้ไข
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteTenant(tenant)}
                                className="text-destructive"
                                disabled={isDeleting}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                ลบ
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TenantFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        tenant={editingTenant}
        onSubmit={handleFormSubmit}
        isLoading={isCreating || isUpdating}
      />

      <TenantDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        tenant={selectedTenant}
      />

      <RoomAssignmentDialog
        open={isRoomAssignOpen}
        onOpenChange={setIsRoomAssignOpen}
        tenant={selectedTenant}
        onAssignRoom={assignRoom}
        isLoading={isAssigningRoom}
      />
    </div>
    </>
  );
};

export default TenantsPage;
