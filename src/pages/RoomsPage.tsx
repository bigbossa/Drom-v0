import { useState, useEffect } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useAuth } from "@/providers/AuthProvider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DoorClosed, MoreVertical, Plus, Edit, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import RoomEditDialog from "@/components/rooms/RoomEditDialog";
import RoomDetailsDialog from "@/components/rooms/RoomDetailsDialog";

type Room = {
  id: string;
  room_number: string;
  room_type: string;
  status: string;
  price: number;
  capacity: number;
  floor: number;
};

export default function RoomsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoom, setNewRoom] = useState({
    room_number: "",
    room_type: "Standard Single",
    status: "vacant",
    price: 3500,
    capacity: 1,
    floor: 1,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();

  // Fetch rooms from Supabase
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('room_number', { ascending: true });

      if (error) {
        console.error('Error fetching rooms:', error);
        toast({
          title: "Error",
          description: "Failed to fetch rooms data.",
          variant: "destructive",
        });
        return;
      }

      // Update room 1 capacity to 2 if it's still 1
      const room1 = data?.find(room => room.room_number === '1');
      if (room1 && room1.capacity === 1) {
        await updateRoom1Capacity();
      }

      setRooms(data || []);
    } catch (err) {
      console.error('Error in fetchRooms:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update room 1 capacity to 2 people
  const updateRoom1Capacity = async () => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ capacity: 2 })
        .eq('room_number', '1');

      if (error) {
        console.error('Error updating room 1 capacity:', error);
        return;
      }

      console.log('Room 1 capacity updated to 2 people');
    } catch (err) {
      console.error('Error in updateRoom1Capacity:', err);
    }
  };

  // Add new room to Supabase
  const handleAddRoom = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert([{
          room_number: newRoom.room_number,
          room_type: newRoom.room_type,
          status: newRoom.status,
          price: newRoom.price,
          capacity: newRoom.capacity,
          floor: newRoom.floor,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding room:', error);
        toast({
          title: "Error",
          description: "Failed to add room. Please check if room number already exists.",
          variant: "destructive",
        });
        return;
      }

      setRooms([...rooms, data]);
      setDialogOpen(false);
      toast({
        title: "Room Added",
        description: `Room ${newRoom.room_number} has been added successfully.`,
      });
      
      // Reset form
      setNewRoom({
        room_number: "",
        room_type: "Standard Single",
        status: "vacant",
        price: 3500,
        capacity: 1,
        floor: 1,
      });
    } catch (err) {
      console.error('Error in handleAddRoom:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred while adding the room.",
        variant: "destructive",
      });
    }
  };

  // Update room status in Supabase
  const handleChangeRoomStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error updating room status:', error);
        toast({
          title: "Error",
          description: "Failed to update room status.",
          variant: "destructive",
        });
        return;
      }

      setRooms(rooms.map((room) => 
        room.id === id ? { ...room, status } : room
      ));
      
      toast({
        title: "Room Status Updated",
        description: `Room status has been updated to ${status}.`,
      });
    } catch (err) {
      console.error('Error in handleChangeRoomStatus:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating room status.",
        variant: "destructive",
      });
    }
  };

  const handleRoomUpdated = (updatedRoom: Room) => {
    setRooms(rooms.map((room) => 
      room.id === updatedRoom.id ? updatedRoom : room
    ));
  };

  const handleViewDetails = (room: Room) => {
    setSelectedRoom(room);
    setDetailsDialogOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setEditDialogOpen(true);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

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

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.room_number
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter
      ? room.status === statusFilter
      : true;
    const matchesType = typeFilter
      ? room.room_type === typeFilter
      : true;
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("rooms.management")}</h1>
        {(user?.role === "admin" || user?.role === "staff") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> {t("rooms.add")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("rooms.add")}</DialogTitle>
                <DialogDescription>
                  Add a new room to the dormitory.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="roomNumber">{t("rooms.number")}</label>
                  <Input
                    id="roomNumber"
                    value={newRoom.room_number}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, room_number: e.target.value })
                    }
                    placeholder="101"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="type">{t("rooms.type")}</label>
                  <Select
                    value={newRoom.room_type}
                    onValueChange={(value) =>
                      setNewRoom({ ...newRoom, room_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard Single">Standard Single</SelectItem>
                      <SelectItem value="Standard Double">Standard Double</SelectItem>
                      <SelectItem value="Deluxe Single">Deluxe Single</SelectItem>
                      <SelectItem value="Deluxe Double">Deluxe Double</SelectItem>
                      <SelectItem value="Suite">Suite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="status">{t("rooms.status")}</label>
                  <Select
                    value={newRoom.status}
                    onValueChange={(value) =>
                      setNewRoom({ ...newRoom, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacant">Vacant</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="price">{t("rooms.rent")}</label>
                  <Input
                    id="price"
                    type="number"
                    value={newRoom.price}
                    onChange={(e) =>
                      setNewRoom({
                        ...newRoom,
                        price: Number(e.target.value),
                      })
                    }
                    placeholder="3500"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="capacity">Capacity</label>
                  <Input
                    id="capacity"
                    type="number"
                    value={newRoom.capacity}
                    onChange={(e) =>
                      setNewRoom({
                        ...newRoom,
                        capacity: Number(e.target.value),
                      })
                    }
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="floor">Floor</label>
                  <Input
                    id="floor"
                    type="number"
                    value={newRoom.floor}
                    onChange={(e) =>
                      setNewRoom({
                        ...newRoom,
                        floor: Number(e.target.value),
                      })
                    }
                    placeholder="1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddRoom}>{t("rooms.add")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by room number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="vacant">Vacant</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={setTypeFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="Standard Single">Standard Single</SelectItem>
              <SelectItem value="Standard Double">Standard Double</SelectItem>
              <SelectItem value="Deluxe Single">Deluxe Single</SelectItem>
              <SelectItem value="Deluxe Double">Deluxe Double</SelectItem>
              <SelectItem value="Suite">Suite</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("rooms.number")}</TableHead>
              <TableHead>{t("rooms.type")}</TableHead>
              <TableHead>{t("rooms.status")}</TableHead>
              <TableHead>{t("rooms.rent")}</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Floor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <DoorClosed className="h-4 w-4 mr-2 text-muted-foreground" />
                      {room.room_number}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{room.room_type}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                        room.status
                      )}`}
                    >
                      {room.status}
                    </span>
                  </TableCell>
                  <TableCell>{formatPrice(room.price)}</TableCell>
                  <TableCell>{room.capacity}</TableCell>
                  <TableCell>{room.floor}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleViewDetails(room)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {(user?.role === "admin" || user?.role === "staff") && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleEditRoom(room)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() =>
                                handleChangeRoomStatus(room.id, "vacant")
                              }
                            >
                              Set as Vacant
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleChangeRoomStatus(room.id, "occupied")
                              }
                            >
                              Set as Occupied
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleChangeRoomStatus(room.id, "maintenance")
                              }
                            >
                              Set as Maintenance
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No rooms found. Try adjusting your search or filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {selectedRoom && (
        <RoomEditDialog
          room={selectedRoom}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onRoomUpdated={handleRoomUpdated}
        />
      )}

      {/* Details Dialog */}
      {selectedRoom && (
        <RoomDetailsDialog
          room={selectedRoom}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}
    </div>
  );
}
