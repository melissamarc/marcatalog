import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function RotaProtegida({ children }) {
  const { usuario, carregandoUsuario } = useAuth();

  if (carregandoUsuario) {
    return <p>Carregando...</p>;
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default RotaProtegida;