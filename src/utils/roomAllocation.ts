// src/utils/roomAllocation.ts
import { RoomTypeConfig, RoomAllocation, RoomTypeBreakdown, Participants } from '@/types/trip';

function allocateRoomsForGroup(
  numberOfPeople: number,
  roomTypes: RoomTypeConfig[]
): RoomTypeBreakdown[] {
  if (numberOfPeople === 0) return [];
  if (roomTypes.length === 0) {
    throw new Error('No room types available');
  }

  // Sort room types by capacity (largest first) for optimal allocation
  const sortedRoomTypes = [...roomTypes].sort((a, b) => b.capacityPerRoom - a.capacityPerRoom);
  
  const allocation: RoomTypeBreakdown[] = [];
  let remainingPeople = numberOfPeople;

  // Try to allocate using larger rooms first
  for (const roomType of sortedRoomTypes) {
    if (remainingPeople === 0) break;

    const roomsNeeded = Math.floor(remainingPeople / roomType.capacityPerRoom);
    
    if (roomsNeeded > 0) {
      allocation.push({
        roomType: roomType.roomType,
        capacityPerRoom: roomType.capacityPerRoom,
        numberOfRooms: roomsNeeded,
        peopleAccommodated: roomsNeeded * roomType.capacityPerRoom,
        costPerRoom: roomType.costPerRoom,
      });
      remainingPeople -= roomsNeeded * roomType.capacityPerRoom;
    }
  }

  // Handle remaining people with the smallest available room
  if (remainingPeople > 0) {
    const smallestRoom = sortedRoomTypes[sortedRoomTypes.length - 1];
    const existingAllocation = allocation.find(a => a.roomType === smallestRoom.roomType);
    
    if (existingAllocation) {
      existingAllocation.numberOfRooms += 1;
      existingAllocation.peopleAccommodated += smallestRoom.capacityPerRoom;
    } else {
      allocation.push({
        roomType: smallestRoom.roomType,
        capacityPerRoom: smallestRoom.capacityPerRoom,
        numberOfRooms: 1,
        peopleAccommodated: smallestRoom.capacityPerRoom,
        costPerRoom: smallestRoom.costPerRoom,
      });
    }
  }

  return allocation;
}

function calculateBreakdownCost(breakdown: RoomTypeBreakdown[]): number {
  return breakdown.reduce((sum, item) => sum + (item.numberOfRooms * item.costPerRoom), 0);
}

export function autoAllocateRooms(
  participants: Participants,
  roomTypes: RoomTypeConfig[]
): RoomAllocation {
  if (roomTypes.length === 0) {
    throw new Error('Please add at least one room type configuration');
  }

  // Validate room types
  for (const rt of roomTypes) {
    if (rt.capacityPerRoom < 1) {
      throw new Error(`Invalid capacity for room type "${rt.roomType}"`);
    }
    if (rt.costPerRoom < 0) {
      throw new Error(`Invalid cost for room type "${rt.roomType}"`);
    }
  }

  // Allocate rooms for each group
  const boysBreakdown = allocateRoomsForGroup(participants.boys, roomTypes);
  const girlsBreakdown = allocateRoomsForGroup(participants.girls, roomTypes);
  const maleFacultyBreakdown = allocateRoomsForGroup(participants.maleFaculty, roomTypes);
  const femaleFacultyBreakdown = allocateRoomsForGroup(participants.femaleFaculty, roomTypes);
  const maleVXplorersBreakdown = allocateRoomsForGroup(participants.maleVXplorers, roomTypes);
  const femaleVXplorersBreakdown = allocateRoomsForGroup(participants.femaleVXplorers, roomTypes);

  // Calculate totals
  const boysRooms = boysBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const girlsRooms = girlsBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const maleFacultyRooms = maleFacultyBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const femaleFacultyRooms = femaleFacultyBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const maleVXplorerRooms = maleVXplorersBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const femaleVXplorerRooms = femaleVXplorersBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);

  return {
    boysRooms,
    girlsRooms,
    maleFacultyRooms,
    femaleFacultyRooms,
    maleVXplorerRooms,
    femaleVXplorerRooms,
    totalRooms: boysRooms + girlsRooms + maleFacultyRooms + femaleFacultyRooms + maleVXplorerRooms + femaleVXplorerRooms,
    breakdown: {
      boys: boysBreakdown,
      girls: girlsBreakdown,
      maleFaculty: maleFacultyBreakdown,
      femaleFaculty: femaleFacultyBreakdown,
      maleVXplorers: maleVXplorersBreakdown,
      femaleVXplorers: femaleVXplorersBreakdown,
    }
  };
}

export function calculateAccommodationCost(
  roomAllocation: RoomAllocation,
  numberOfNights: number,
  currencyRate: number
): { totalCost: number; totalCostINR: number } {
  if (!roomAllocation.breakdown) {
    // Fallback for old data structure
    return { totalCost: 0, totalCostINR: 0 };
  }

  let totalCostInCurrency = 0;

  // Sum costs from all groups
  Object.values(roomAllocation.breakdown).forEach(breakdown => {
    totalCostInCurrency += calculateBreakdownCost(breakdown);
  });

  // Multiply by nights
  totalCostInCurrency *= numberOfNights;

  return {
    totalCost: totalCostInCurrency,
    totalCostINR: totalCostInCurrency * currencyRate,
  };
}

export function validateRoomAllocation(
  participants: Participants,
  roomAllocation: RoomAllocation
): string[] {
  const errors: string[] = [];

  if (!roomAllocation.breakdown) {
    errors.push('Room allocation breakdown is missing');
    return errors;
  }

  // Validate each group
  const validations = [
    { name: 'Boys', expected: participants.boys, breakdown: roomAllocation.breakdown.boys },
    { name: 'Girls', expected: participants.girls, breakdown: roomAllocation.breakdown.girls },
    { name: 'Male Faculty', expected: participants.maleFaculty, breakdown: roomAllocation.breakdown.maleFaculty },
    { name: 'Female Faculty', expected: participants.femaleFaculty, breakdown: roomAllocation.breakdown.femaleFaculty },
    { name: 'Male VXplorers', expected: participants.maleVXplorers, breakdown: roomAllocation.breakdown.maleVXplorers },
    { name: 'Female VXplorers', expected: participants.femaleVXplorers, breakdown: roomAllocation.breakdown.femaleVXplorers },
  ];

  validations.forEach(({ name, expected, breakdown }) => {
    const accommodated = breakdown.reduce((sum, b) => sum + b.peopleAccommodated, 0);
    
    if (expected > 0 && accommodated < expected) {
      errors.push(`${name}: Insufficient rooms (${expected} people, only ${accommodated} can be accommodated)`);
    }
  });

  return errors;
}

export function getRoomTypePresets(): Record<string, RoomTypeConfig[]> {
  return {
    'Double Only': [
      { roomType: 'Double', capacityPerRoom: 2, costPerRoom: 0 }
    ],
    'Triple Only': [
      { roomType: 'Triple', capacityPerRoom: 3, costPerRoom: 0 }
    ],
    'Double + Triple': [
      { roomType: 'Triple', capacityPerRoom: 3, costPerRoom: 0 },
      { roomType: 'Double', capacityPerRoom: 2, costPerRoom: 0 }
    ],
    'Single + Double': [
      { roomType: 'Double', capacityPerRoom: 2, costPerRoom: 0 },
      { roomType: 'Single', capacityPerRoom: 1, costPerRoom: 0 }
    ],
    'All Types': [
      { roomType: 'Quad', capacityPerRoom: 4, costPerRoom: 0 },
      { roomType: 'Triple', capacityPerRoom: 3, costPerRoom: 0 },
      { roomType: 'Double', capacityPerRoom: 2, costPerRoom: 0 },
      { roomType: 'Single', capacityPerRoom: 1, costPerRoom: 0 }
    ],
  };
}