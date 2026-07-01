import AssessmentForm from "../../components/assessments/AssessmentForm";

export default function MChat() {

    // Temporário
    // Depois receberemos paciente pela rota.

    return (

        <AssessmentForm

            formularioId={3}

            pacienteId={1}

            moduloId={1}

            instrumento="MCHAT"

        />

    );

}