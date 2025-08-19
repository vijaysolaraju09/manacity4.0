import { Role, VerificationStatus, UserAttrs } from '../../models/User';

let phoneSeed = 1000000000;

export function userFactory(overrides: Partial<UserAttrs> = {}): UserAttrs {
  phoneSeed += 1;
  return {
    phone: String(phoneSeed),
    name: 'Test User',
    roles: [Role.CUSTOMER],
    verificationStatus: VerificationStatus.PENDING,
    auth: { passwordHash: 'hashedPassword' },
    location: { city: 'Test City', pincode: '000000' },
    ...overrides,
  } as UserAttrs;
}

