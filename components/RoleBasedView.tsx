'use client';

import { ReactNode } from 'react';
import { UserRole, hasPermission } from '@/lib/rbac';

interface RoleBasedViewProps {
  role: UserRole;
  resource: string;
  action: 'read' | 'write' | 'execute' | 'approve' | 'configure';
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * RoleBasedView component that conditionally renders content based on user permissions.
 */
export default function RoleBasedView({
  role,
  resource,
  action,
  children,
  fallback = null,
}: RoleBasedViewProps) {
  if (hasPermission(role, resource, action)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
