
export type StatValue = 'A' | 'B' | 'C' | 'D' | 'E' | 'N/A';

export interface StandStats {
  power: StatValue;
  speed: StatValue;
  range: StatValue;
  durability: StatValue;
  precision: StatValue;
  potential: StatValue;
}

export interface StandStatRawValues {
  power?: string;
  speed?: string;
  range?: string;
  durability?: string;
  precision?: string;
  potential?: string;
}

export interface FarcasterProfile {
  fid: number;
  username: string;
  displayName: string;
  bio: string;
  pfpUrl: string;
  followerCount: number;
  followingCount: number;
  castCount: number;
  likesReceived: number;
  recastsReceived: number;
  verifications: string[]; // ETH addresses
  powerBadge: boolean;
}

export interface StandResult {
  standName: string;
  gender: 'MALE' | 'FEMALE';
  userAnalysis: string;
  standDescription: string;
  ability: string;
  battleCry: string;
  stats: StandStats;
  statDetails?: StandStatRawValues; // Added for displaying raw metrics
  standImageUrl?: string;
  visualPrompt?: string;
}
