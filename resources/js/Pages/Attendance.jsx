import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AttendancePuncher } from "@/components/AttendancePuncher";
import { MyScheduleView } from "@/components/MyScheduleView";
import { Clock } from "lucide-react";

export default function Attendance() {
    const { can } = useAuth();
    const navigate = useNavigate();
    const canAccess = can("attendances.view_own") || can("attendances.record_own");
    const canViewSchedule = can("attendances.view_own");

    useEffect(() => {
        if (!canAccess) navigate("/", { replace: true });
    }, [canAccess, navigate]);

    if (!canAccess) return null;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-300">
            <div>
                <h1 className="text-3xl font-black tracking-tighter uppercase text-foreground flex items-center gap-3">
                    <Clock className="h-8 w-8 text-primary" />
                    Asistencia
                </h1>
                <p className="text-muted-foreground font-medium text-sm mt-1">
                    Registra tu entrada, comida y salida según tu horario asignado.
                </p>
            </div>

            <div className="space-y-6 max-w-2xl">
                {canViewSchedule && (
                    <div>
                        <MyScheduleView />
                    </div>
                )}
                <div>
                    <AttendancePuncher />
                </div>
            </div>
        </div>
    );
}
