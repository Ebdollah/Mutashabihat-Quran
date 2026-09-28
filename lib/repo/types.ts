export type SetMember = {
  id: string;
  setId: string;
  verseKey: string; // "2:58"
  surah: number;
  ayah: number;
  phraseStart: number; // word index into tokenize(textSnapshot), inclusive
  phraseEnd: number; // inclusive
  phraseText: string; // snapshot of the marked words
  textSnapshot: string; // full text_uthmani when the ayah was added
  position: number; // order inside the set
  createdAt: string; // ISO
};

export type MutashabihSet = {
  id: string;
  userId: string;
  title: string;
  note: string | null;
  members: SetMember[]; // sorted by position
  createdAt: string;
  updatedAt: string;
};

export type NewMember = {
  verseKey: string;
  phraseStart: number;
  phraseEnd: number;
  textSnapshot: string;
};

export type User = {
  id: string;
  email: string; // stored lower-case
  name: string | null;
  passwordHash: string;
  createdAt: string;
};

export class RepoError extends Error {
  constructor(
    public code: 'not_found' | 'duplicate_member' | 'email_taken' | 'invalid',
    message: string,
  ) {
    super(message);
  }
}

export interface UsersRepository {
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  createUser(input: { email: string; name: string | null; passwordHash: string }): Promise<User>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}

export interface SetsRepository {
  listSets(userId: string): Promise<MutashabihSet[]>; // most recently updated first
  getSet(userId: string, setId: string): Promise<MutashabihSet | null>;
  findSetsByVerse(userId: string, verseKey: string): Promise<MutashabihSet[]>;
  createSet(userId: string, input: { title?: string; members: NewMember[] }): Promise<MutashabihSet>;
  addMember(userId: string, setId: string, member: NewMember): Promise<MutashabihSet>;
  updateMemberPhrase(userId: string, memberId: string, phraseStart: number, phraseEnd: number): Promise<MutashabihSet>;
  /** Returns the updated set, or null when the last member was removed and the set deleted. */
  removeMember(userId: string, memberId: string): Promise<MutashabihSet | null>;
  renameSet(userId: string, setId: string, title: string): Promise<MutashabihSet>;
  reorderMembers(userId: string, setId: string, memberIds: string[]): Promise<MutashabihSet>;
  deleteSet(userId: string, setId: string): Promise<void>;
}

export type Repository = UsersRepository & SetsRepository;
