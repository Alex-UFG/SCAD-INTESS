
import { getTranslations } from "next-intl/server";
import { getPeriodos } from "@/app/actions/periodos";
import PeriodosClient from "./periodos-client";

export const metadata = {
  title: "Períodos evaluativos | SCAD-INTESS",
  description: "Administración de períodos evaluativos",
};

export const dynamic = "force-dynamic";

export default async function PeriodosPage() {
  const t = await getTranslations("periodos");
  const periodos = await getPeriodos();

  return (
    <PeriodosClient
      periodos={periodos}
      labels={{
        total: t("total"),
        abiertos: t("abiertos"),
        cerrados: t("cerrados"),
        pendientes: t("pendientes"),
        title: t("title"),
        subtitle: t("subtitle"),
        ciclo: t("ciclo"),
        periodo: t("periodo"),
        fechaInicio: t("fechaInicio"),
        fechaCierre: t("fechaCierre"),
        detalle: t("detalle"),
        detalleDescripcion: t("detalleDescripcion"),
        colPeriodo: t("colPeriodo"),
        colEstado: t("colEstado"),
        sinPeriodos: t("sinPeriodos"),
        abrir: t("abrir"),
        cerrar: t("cerrar"),
        confirmarAbrir: t("confirmarAbrir"),
        confirmarCerrar: t("confirmarCerrar"),
        procesando: t("procesando"),
        exitoAbrir: t("exitoAbrir"),
        exitoCerrar: t("exitoCerrar"),
        errorOperacion: t("errorOperacion"),
        editarFechas: t("editarFechas"),
        guardarFechas: t("guardarFechas"),
        cancelar: t("cancelar"),
        confirmarFechas: t("confirmarFechas"),
        exitoFechas: t("exitoFechas"),
      }}
    />
  );
}
