import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { getToken, clearToken } from "../auth/token";
import { isTokenExpired } from "../auth/isTokenExpired";

type Props = {
  children: ReactNode;
};

const ProtectedRoute = ({ children }: Props) => {
  const token = getToken();

  if (!token || isTokenExpired(token)) {
    clearToken();
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
