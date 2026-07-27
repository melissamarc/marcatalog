import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";

function RotaAssinante({ children }) {
  const { usuario, carregandoUsuario } = useAuth();

  const [possuiAcesso, setPossuiAcesso] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    async function verificarAssinatura() {
      if (!usuario) {
        setVerificando(false);
        return;
      }

      const { data, error } = await supabase.rpc(
        "assinatura_ativa_para_usuario",
        {
          usuario_verificado: usuario.id,
        }
      );

      if (error) {
        setPossuiAcesso(false);
        setVerificando(false);
        return;
      }

      setPossuiAcesso(Boolean(data));
      setVerificando(false);
    }

    if (!carregandoUsuario) {
      verificarAssinatura();
    }
  }, [usuario, carregandoUsuario]);

  if (carregandoUsuario || verificando) {
    return <p>Verificando assinatura...</p>;
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (!possuiAcesso) {
    return <Navigate to="/planos" replace />;
  }

  return children;
}

export default RotaAssinante;