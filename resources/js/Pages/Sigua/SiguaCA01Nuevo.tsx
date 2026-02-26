import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Ruta /sigua/ca01/nuevo: redirige a la lista CA-01 con el formulario de nuevo CA-01 abierto.
 * El componente SiguaCA01 lee el query openForm=1 y abre el modal al montar.
 */
export default function SiguaCA01Nuevo() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/sigua/ca01?openForm=1", { replace: true });
  }, [navigate]);
  return null;
}
