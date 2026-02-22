export type UserRole = 'teacher' | 'parent' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
}

// This is a mock JWT. In a real app, this would be provided by the OIDC provider.
const mockJwt = (user: { id: string, role: UserRole, name: string }) => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        sub: user.id,
        name: user.name,
        // In a real token, use 'roles' or a custom claim for the role
        // And 'exp' for expiration
        role: user.role, 
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // Expires in 1 hour
    };
    // This is NOT a secure signature, just for mocking format.
    const signature = 'mock-signature';
    return `${btoa(JSON.stringify(header))}.${btoa(JSON.stringify(payload))}.${signature}`;
};


const teacherUser: User = {
  id: 'teacher-01',
  name: 'Dr. Evelyn Reed',
  email: 'e.reed@school.edu',
  avatarUrl: 'https://picsum.photos/seed/teacher1/100/100',
  role: 'teacher',
};

const parentUser: User = {
  id: 'parent-01',
  name: 'John Doe',
  email: 'j.doe@family.com',
  avatarUrl: 'https://picsum.photos/seed/parent1/100/100',
  role: 'parent',
};

const adminUser: User = {
  id: 'admin-01',
  name: 'Admin User',
  email: 'admin@school.edu',
  avatarUrl: 'https://picsum.photos/seed/admin1/100/100',
  role: 'admin',
};

export const mockUsers = {
  teacher: teacherUser,
  parent: parentUser,
  admin: adminUser,
};

export const getMockToken = (role: UserRole) => {
    return mockJwt(mockUsers[role]);
}
