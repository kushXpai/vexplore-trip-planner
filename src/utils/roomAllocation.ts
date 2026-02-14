// src/utils/roomAllocation.ts
import {
  RoomTypeConfig,
  RoomAllocation,
  RoomTypeBreakdown,
  Participants,
  RoomPreferences,
  TripType
} from '@/types/trip';

/**
 * Allocate rooms for a group using COST OPTIMIZATION
 * Finds the cheapest combination of rooms that accommodates all people
 */
function allocateRoomsWithCostOptimization(
  numberOfPeople: number,
  roomTypes: RoomTypeConfig[],
  preferences: string[],
  isFaculty: boolean = false
): RoomTypeBreakdown[] {
  if (numberOfPeople === 0) return [];
  if (roomTypes.length === 0) {
    throw new Error('No room types available');
  }

  // CRITICAL: Faculty ALWAYS get single rooms
  if (isFaculty) {
    const singleRoom = roomTypes.find(rt => rt.roomType.toLowerCase() === 'single');
    if (!singleRoom) {
      throw new Error('Single room type required for faculty allocation');
    }

    return [{
      roomType: singleRoom.roomType,
      capacityPerRoom: 1,
      numberOfRooms: numberOfPeople,
      peopleAccommodated: numberOfPeople,
      costPerRoom: singleRoom.costPerRoom,
    }];
  }

  // Filter room types to only include those in preferences
  const preferredRoomTypes = preferences
    .map(pref => roomTypes.find(rt => rt.roomType.toLowerCase() === pref.toLowerCase()))
    .filter((rt): rt is RoomTypeConfig => rt !== undefined);

  if (preferredRoomTypes.length === 0) {
    throw new Error('No valid room types found matching preferences');
  }

  // Dynamic programming approach to find minimum cost allocation
  // dp[i] = minimum cost to accommodate exactly i people
  const dp: number[] = new Array(numberOfPeople + 1).fill(Infinity);
  const parent: Array<{ roomType: RoomTypeConfig; people: number } | null> = new Array(numberOfPeople + 1).fill(null);
  
  dp[0] = 0;

  // Build up the solution
  for (let people = 0; people <= numberOfPeople; people++) {
    if (dp[people] === Infinity) continue;

    for (const roomType of preferredRoomTypes) {
      const nextPeople = Math.min(people + roomType.capacityPerRoom, numberOfPeople + roomType.capacityPerRoom);
      
      // We can accommodate at most numberOfPeople, but a room might have extra capacity
      if (people < numberOfPeople) {
        const newCost = dp[people] + roomType.costPerRoom;
        const actualPeople = Math.min(people + roomType.capacityPerRoom, numberOfPeople);
        
        if (newCost < dp[actualPeople]) {
          dp[actualPeople] = newCost;
          parent[actualPeople] = { roomType, people: actualPeople - people };
        }
      }
    }
  }

  // If we couldn't accommodate everyone with exact capacity, find minimum cost with waste
  let bestSolution = numberOfPeople;
  let minCost = dp[numberOfPeople];

  // Check if we need to use rooms with wasted capacity
  if (minCost === Infinity) {
    for (let i = numberOfPeople; i <= numberOfPeople + 20; i++) {
      if (dp[i] !== Infinity && dp[i] < minCost) {
        minCost = dp[i];
        bestSolution = i;
      }
    }

    // If still no solution, fall back to greedy
    if (minCost === Infinity) {
      return allocateRoomsWithPreferences(numberOfPeople, roomTypes, preferences, isFaculty);
    }
  }

  // Backtrack to build the allocation
  const allocation: Map<string, { count: number; config: RoomTypeConfig }> = new Map();
  let current = bestSolution;

  while (current > 0 && parent[current]) {
    const { roomType } = parent[current]!;
    const key = roomType.roomType;
    
    if (allocation.has(key)) {
      allocation.get(key)!.count++;
    } else {
      allocation.set(key, { count: 1, config: roomType });
    }

    const prevPeople = current - Math.min(roomType.capacityPerRoom, current);
    current = prevPeople;
  }

  // Convert map to breakdown format
  const breakdown: RoomTypeBreakdown[] = [];
  let totalAccommodated = 0;

  for (const [roomTypeName, { count, config }] of allocation.entries()) {
    const accommodated = Math.min(count * config.capacityPerRoom, numberOfPeople - totalAccommodated);
    breakdown.push({
      roomType: config.roomType,
      capacityPerRoom: config.capacityPerRoom,
      numberOfRooms: count,
      peopleAccommodated: accommodated,
      costPerRoom: config.costPerRoom,
    });
    totalAccommodated += accommodated;
  }

  return breakdown;
}

/**
 * Allocate rooms for a group based on PREFERENCE ORDER (greedy)
 * Faculty ALWAYS get single rooms (1 person per room)
 */
function allocateRoomsWithPreferences(
  numberOfPeople: number,
  roomTypes: RoomTypeConfig[],
  preferences: string[],
  isFaculty: boolean = false
): RoomTypeBreakdown[] {
  if (numberOfPeople === 0) return [];
  if (roomTypes.length === 0) {
    throw new Error('No room types available');
  }

  // CRITICAL: Faculty ALWAYS get single rooms
  if (isFaculty) {
    const singleRoom = roomTypes.find(rt => rt.roomType.toLowerCase() === 'single');
    if (!singleRoom) {
      throw new Error('Single room type required for faculty allocation');
    }

    // Allocate one single room per faculty member
    return [{
      roomType: singleRoom.roomType,
      capacityPerRoom: 1,
      numberOfRooms: numberOfPeople,
      peopleAccommodated: numberOfPeople,
      costPerRoom: singleRoom.costPerRoom,
    }];
  }

  // Filter room types to only include those in preferences
  const preferredRoomTypes = preferences
    .map(pref => roomTypes.find(rt => rt.roomType.toLowerCase() === pref.toLowerCase()))
    .filter((rt): rt is RoomTypeConfig => rt !== undefined);

  if (preferredRoomTypes.length === 0) {
    throw new Error('No valid room types found matching preferences');
  }

  const allocation: RoomTypeBreakdown[] = [];
  let remainingPeople = numberOfPeople;

  // Step 1: Greedy allocation in preference order
  for (const roomType of preferredRoomTypes) {
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

  // Step 2: Smart remainder handling - only use preferred room types
  if (remainingPeople > 0) {
    // Try to find an exact fit first
    let exactFitRoom: RoomTypeConfig | null = null;

    for (const roomType of preferredRoomTypes) {
      if (roomType.capacityPerRoom === remainingPeople) {
        exactFitRoom = roomType;
        break;
      }
    }

    if (exactFitRoom) {
      // Use exact fit room
      const existingAllocation = allocation.find(a => a.roomType === exactFitRoom!.roomType);

      if (existingAllocation) {
        existingAllocation.numberOfRooms += 1;
        existingAllocation.peopleAccommodated += exactFitRoom.capacityPerRoom;
      } else {
        allocation.push({
          roomType: exactFitRoom.roomType,
          capacityPerRoom: exactFitRoom.capacityPerRoom,
          numberOfRooms: 1,
          peopleAccommodated: exactFitRoom.capacityPerRoom,
          costPerRoom: exactFitRoom.costPerRoom,
        });
      }
      remainingPeople = 0;
    } else {
      // No exact fit - use smallest room from preferences that can accommodate
      const sortedPreferred = [...preferredRoomTypes].sort((a, b) => a.capacityPerRoom - b.capacityPerRoom);

      const suitableRoom = sortedPreferred.find(rt => rt.capacityPerRoom >= remainingPeople);
      const roomToUse = suitableRoom || sortedPreferred[0]; // Fallback to smallest if none can fit

      const existingAllocation = allocation.find(a => a.roomType === roomToUse.roomType);

      if (existingAllocation) {
        existingAllocation.numberOfRooms += 1;
        existingAllocation.peopleAccommodated += roomToUse.capacityPerRoom;
      } else {
        allocation.push({
          roomType: roomToUse.roomType,
          capacityPerRoom: roomToUse.capacityPerRoom,
          numberOfRooms: 1,
          peopleAccommodated: roomToUse.capacityPerRoom,
          costPerRoom: roomToUse.costPerRoom,
        });
      }
      remainingPeople = 0;
    }
  }

  return allocation;
}

/**
 * Fallback allocation (largest room first) when no preferences specified
 */
function allocateRoomsForGroup(
  numberOfPeople: number,
  roomTypes: RoomTypeConfig[]
): RoomTypeBreakdown[] {
  if (numberOfPeople === 0) return [];
  if (roomTypes.length === 0) {
    throw new Error('No room types available');
  }

  // Sort room types by capacity (largest first)
  const sortedRoomTypes = [...roomTypes].sort((a, b) => b.capacityPerRoom - a.capacityPerRoom);

  const allocation: RoomTypeBreakdown[] = [];
  let remainingPeople = numberOfPeople;

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

/**
 * Auto-allocate rooms with preference support and optional cost optimization
 * Faculty ALWAYS get single rooms
 * Supports both institute and commercial trips
 * 
 * @param optimizeByCost - If true, finds cheapest allocation within preferences. If false, follows strict preference order.
 */
export function autoAllocateRooms(
  participants: Participants,
  roomTypes: RoomTypeConfig[],
  preferences?: RoomPreferences,
  tripType?: TripType,
  optimizeByCost: boolean = false  // NEW PARAMETER
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

  // Ensure single room type exists for faculty
  const hasSingleRoom = roomTypes.some(rt => rt.roomType.toLowerCase() === 'single');
  if (!hasSingleRoom && (participants.maleFaculty > 0 || participants.femaleFaculty > 0)) {
    throw new Error('Single room type is required for faculty allocation');
  }

  // Choose allocation function based on optimization flag
  const allocationFunction = optimizeByCost ? allocateRoomsWithCostOptimization : allocateRoomsWithPreferences;

  let boysBreakdown: RoomTypeBreakdown[] = [];
  let girlsBreakdown: RoomTypeBreakdown[] = [];
  let maleFacultyBreakdown: RoomTypeBreakdown[] = [];
  let femaleFacultyBreakdown: RoomTypeBreakdown[] = [];
  let maleVXplorersBreakdown: RoomTypeBreakdown[] = [];
  let femaleVXplorersBreakdown: RoomTypeBreakdown[] = [];
  let commercialMaleBreakdown: RoomTypeBreakdown[] = [];
  let commercialFemaleBreakdown: RoomTypeBreakdown[] = [];
  let commercialOtherBreakdown: RoomTypeBreakdown[] = [];
  let commercialMaleVXplorersBreakdown: RoomTypeBreakdown[] = [];
  let commercialFemaleVXplorersBreakdown: RoomTypeBreakdown[] = [];

  if (tripType === 'commercial') {
    // Commercial trip allocations
    const participantsPrefs = preferences?.participants || [];
    const commercialVXplorersPrefs = preferences?.commercialVXplorers || [];

    commercialMaleBreakdown = participants.maleCount > 0
      ? (participantsPrefs.length > 0
        ? allocationFunction(participants.maleCount, roomTypes, participantsPrefs)
        : allocateRoomsForGroup(participants.maleCount, roomTypes))
      : [];

    commercialFemaleBreakdown = participants.femaleCount > 0
      ? (participantsPrefs.length > 0
        ? allocationFunction(participants.femaleCount, roomTypes, participantsPrefs)
        : allocateRoomsForGroup(participants.femaleCount, roomTypes))
      : [];

    commercialOtherBreakdown = participants.otherCount > 0
      ? (participantsPrefs.length > 0
        ? allocationFunction(participants.otherCount, roomTypes, participantsPrefs)
        : allocateRoomsForGroup(participants.otherCount, roomTypes))
      : [];

    commercialMaleVXplorersBreakdown = participants.commercialMaleVXplorers > 0
      ? (commercialVXplorersPrefs.length > 0
        ? allocationFunction(participants.commercialMaleVXplorers, roomTypes, commercialVXplorersPrefs)
        : allocateRoomsForGroup(participants.commercialMaleVXplorers, roomTypes))
      : [];

    commercialFemaleVXplorersBreakdown = participants.commercialFemaleVXplorers > 0
      ? (commercialVXplorersPrefs.length > 0
        ? allocationFunction(participants.commercialFemaleVXplorers, roomTypes, commercialVXplorersPrefs)
        : allocateRoomsForGroup(participants.commercialFemaleVXplorers, roomTypes))
      : [];
  } else {
    // Institute trip allocations
    const studentsPrefs = preferences?.students || [];
    const vxplorersPrefs = preferences?.vxplorers || [];

    boysBreakdown = participants.boys > 0
      ? (studentsPrefs.length > 0
        ? allocationFunction(participants.boys, roomTypes, studentsPrefs)
        : allocateRoomsForGroup(participants.boys, roomTypes))
      : [];

    girlsBreakdown = participants.girls > 0
      ? (studentsPrefs.length > 0
        ? allocationFunction(participants.girls, roomTypes, studentsPrefs)
        : allocateRoomsForGroup(participants.girls, roomTypes))
      : [];

    // FACULTY ALWAYS GET SINGLE ROOMS (never optimized, always single)
    maleFacultyBreakdown = participants.maleFaculty > 0
      ? allocateRoomsWithPreferences(participants.maleFaculty, roomTypes, ['single'], true)
      : [];

    femaleFacultyBreakdown = participants.femaleFaculty > 0
      ? allocateRoomsWithPreferences(participants.femaleFaculty, roomTypes, ['single'], true)
      : [];

    // VXplorers allocation with preferences
    maleVXplorersBreakdown = participants.maleVXplorers > 0
      ? (vxplorersPrefs.length > 0
        ? allocationFunction(participants.maleVXplorers, roomTypes, vxplorersPrefs)
        : allocateRoomsForGroup(participants.maleVXplorers, roomTypes))
      : [];

    femaleVXplorersBreakdown = participants.femaleVXplorers > 0
      ? (vxplorersPrefs.length > 0
        ? allocationFunction(participants.femaleVXplorers, roomTypes, vxplorersPrefs)
        : allocateRoomsForGroup(participants.femaleVXplorers, roomTypes))
      : [];
  }

  // Calculate totals
  const boysRooms = boysBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const girlsRooms = girlsBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const maleFacultyRooms = maleFacultyBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const femaleFacultyRooms = femaleFacultyBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const maleVXplorerRooms = maleVXplorersBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const femaleVXplorerRooms = femaleVXplorersBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const commercialMaleRooms = commercialMaleBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const commercialFemaleRooms = commercialFemaleBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const commercialOtherRooms = commercialOtherBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const commercialMaleVXplorerRooms = commercialMaleVXplorersBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);
  const commercialFemaleVXplorerRooms = commercialFemaleVXplorersBreakdown.reduce((sum, b) => sum + b.numberOfRooms, 0);

  return {
    boysRooms,
    girlsRooms,
    maleFacultyRooms,
    femaleFacultyRooms,
    maleVXplorerRooms,
    femaleVXplorerRooms,
    commercialMaleRooms,
    commercialFemaleRooms,
    commercialOtherRooms,
    commercialMaleVXplorerRooms,
    commercialFemaleVXplorerRooms,
    totalRooms: boysRooms + girlsRooms + maleFacultyRooms + femaleFacultyRooms +
      maleVXplorerRooms + femaleVXplorerRooms + commercialMaleRooms +
      commercialFemaleRooms + commercialOtherRooms + commercialMaleVXplorerRooms +
      commercialFemaleVXplorerRooms,
    breakdown: {
      boys: boysBreakdown,
      girls: girlsBreakdown,
      maleFaculty: maleFacultyBreakdown,
      femaleFaculty: femaleFacultyBreakdown,
      maleVXplorers: maleVXplorersBreakdown,
      femaleVXplorers: femaleVXplorersBreakdown,
      commercialMale: commercialMaleBreakdown,
      commercialFemale: commercialFemaleBreakdown,
      commercialOther: commercialOtherBreakdown,
      commercialMaleVXplorers: commercialMaleVXplorersBreakdown,
      commercialFemaleVXplorers: commercialFemaleVXplorersBreakdown,
    }
  };
}

export function calculateAccommodationCost(
  roomAllocation: RoomAllocation,
  numberOfNights: number,
  currencyRate: number
): { totalCost: number; totalCostINR: number } {
  if (!roomAllocation.breakdown) {
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
  roomAllocation: RoomAllocation,
  tripType?: TripType
): string[] {
  const errors: string[] = [];

  if (!roomAllocation.breakdown) {
    errors.push('Room allocation breakdown is missing');
    return errors;
  }

  if (tripType === 'commercial') {
    // Validate commercial allocations
    const validations = [
      { name: 'Male Participants', expected: participants.maleCount, breakdown: roomAllocation.breakdown.commercialMale },
      { name: 'Female Participants', expected: participants.femaleCount, breakdown: roomAllocation.breakdown.commercialFemale },
      { name: 'Other Participants', expected: participants.otherCount, breakdown: roomAllocation.breakdown.commercialOther },
      { name: 'Male VXplorers', expected: participants.commercialMaleVXplorers, breakdown: roomAllocation.breakdown.commercialMaleVXplorers },
      { name: 'Female VXplorers', expected: participants.commercialFemaleVXplorers, breakdown: roomAllocation.breakdown.commercialFemaleVXplorers },
    ];

    validations.forEach(({ name, expected, breakdown }) => {
      const accommodated = breakdown.reduce((sum, b) => sum + b.peopleAccommodated, 0);

      if (expected > 0 && accommodated < expected) {
        errors.push(`${name}: Insufficient rooms (${expected} people, only ${accommodated} can be accommodated)`);
      }
    });
  } else {
    // Validate institute allocations
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

    // Validate faculty have single rooms
    const maleFacultyHasNonSingle = roomAllocation.breakdown.maleFaculty.some(
      b => b.roomType.toLowerCase() !== 'single'
    );
    const femaleFacultyHasNonSingle = roomAllocation.breakdown.femaleFaculty.some(
      b => b.roomType.toLowerCase() !== 'single'
    );

    if (maleFacultyHasNonSingle) {
      errors.push('Male faculty must have single rooms only');
    }
    if (femaleFacultyHasNonSingle) {
      errors.push('Female faculty must have single rooms only');
    }
  }

  return errors;
}

export function getRoomTypePresets(): Record<string, RoomTypeConfig[]> {
  return {
    'Single Only': [
      { roomType: 'Single', capacityPerRoom: 1, costPerRoom: 0 }
    ],
    'Double Only': [
      { roomType: 'Double', capacityPerRoom: 2, costPerRoom: 0 }
    ],
    'Triple Only': [
      { roomType: 'Triple', capacityPerRoom: 3, costPerRoom: 0 }
    ],
    'Double + Triple': [
      { roomType: 'Double', capacityPerRoom: 2, costPerRoom: 0 },
      { roomType: 'Triple', capacityPerRoom: 3, costPerRoom: 0 }
    ],
    'Single + Double': [
      { roomType: 'Single', capacityPerRoom: 1, costPerRoom: 0 },
      { roomType: 'Double', capacityPerRoom: 2, costPerRoom: 0 }
    ],
    'All Types': [
      { roomType: 'Single', capacityPerRoom: 1, costPerRoom: 0 },
      { roomType: 'Double', capacityPerRoom: 2, costPerRoom: 0 },
      { roomType: 'Triple', capacityPerRoom: 3, costPerRoom: 0 },
      { roomType: 'Quad', capacityPerRoom: 4, costPerRoom: 0 }
    ],
  };
}

/**
 * Get default room preferences based on trip type
 * RETURNS EMPTY ARRAYS - preferences must be set by user in UI
 */
export function getDefaultRoomPreferences(tripType: TripType): RoomPreferences {
  if (tripType === 'commercial') {
    return {
      participants: [],
      commercialVXplorers: []
    };
  } else {
    return {
      students: [],
      faculty: ['single'],  // ALWAYS single for faculty (non-negotiable)
      vxplorers: []
    };
  }
}