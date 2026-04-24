export const permissions = {
  licenseRead: "license:read",
  licenseWrite: "license:write",
  userRead: "user:read",
  userManage: "user:manage",
  systemAdmin: "system:admin",
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions];

export const roles = {
  owner: "owner",
  admin: "admin",
  member: "member",
  viewer: "viewer",
} as const;

export type Role = (typeof roles)[keyof typeof roles];
