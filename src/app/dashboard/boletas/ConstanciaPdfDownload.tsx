"use client";

import {
  Document,
  Page,
  PDFDownloadLink,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { DatosConstanciaMatricula } from "@/app/actions/constancias";

interface Props {
  constancia: DatosConstanciaMatricula;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 52,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1e293b",
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#1d4ed8",
    paddingBottom: 18,
    marginBottom: 35,
  },
  institution: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#173b70",
  },
  subtitle: {
    marginTop: 5,
    fontSize: 9,
    color: "#475569",
  },
  title: {
    marginTop: 25,
    fontSize: 16,
    fontWeight: "bold",
    color: "#173b70",
  },
  code: {
    marginTop: 5,
    fontSize: 9,
    color: "#64748b",
  },
  body: {
    fontSize: 11,
    lineHeight: 1.8,
    textAlign: "justify",
    marginTop: 20,
  },
  studentName: {
    fontWeight: "bold",
    color: "#173b70",
  },
  details: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 0.7,
    borderColor: "#cbd5e1",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  detailLabel: {
    width: "38%",
    fontSize: 9,
    color: "#64748b",
  },
  detailValue: {
    width: "62%",
    fontSize: 10,
    fontWeight: "bold",
  },
  closing: {
    marginTop: 25,
    fontSize: 10,
    lineHeight: 1.7,
    textAlign: "justify",
  },
  date: {
    marginTop: 30,
    fontSize: 10,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 52,
    right: 52,
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    paddingTop: 8,
    textAlign: "center",
    fontSize: 7,
    color: "#64748b",
  },
});

function fechaLegible(fecha: string): string {
  const partes = fecha.split("-");
  if (partes.length !== 3) return fecha;

  const [anio, mes, dia] = partes;
  const date = new Date(Number(anio), Number(mes) - 1, Number(dia));

  return date.toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ConstanciaDocument({ constancia }: Props) {
  const fechaGeneracion = new Date().toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={`Constancia de matrícula ${constancia.nie} - ${constancia.anio}`}
      author="SCAD-INTESS"
      subject="Constancia de matrícula vigente"
    >
      <Page size="LETTER" orientation="portrait" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.institution}>SCAD-INTESS</Text>
          <Text style={styles.subtitle}>
            Instituto Nacional Tecnológico de San Salvador
          </Text>
          <Text style={styles.title}>CONSTANCIA DE MATRÍCULA</Text>
          <Text style={styles.code}>REP-03</Text>
        </View>

        <Text style={styles.body}>
          Por medio de la presente se hace constar que el estudiante{" "}
          <Text style={styles.studentName}>{constancia.nombre}</Text>, con
          Número de Identificación Estudiantil (NIE){" "}
          <Text style={styles.studentName}>{constancia.nie}</Text>, registra
          matrícula vigente en esta institución para el ciclo escolar{" "}
          <Text style={styles.studentName}>{constancia.anio}</Text>.
        </Text>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nombre del estudiante</Text>
            <Text style={styles.detailValue}>{constancia.nombre}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>NIE</Text>
            <Text style={styles.detailValue}>{constancia.nie}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Grado y sección</Text>
            <Text style={styles.detailValue}>
              {constancia.grado}° {constancia.seccion}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Especialidad</Text>
            <Text style={styles.detailValue}>{constancia.especialidad}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ciclo escolar</Text>
            <Text style={styles.detailValue}>{constancia.anio}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fecha de matrícula</Text>
            <Text style={styles.detailValue}>
              {fechaLegible(constancia.fechaMatricula)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estado</Text>
            <Text style={styles.detailValue}>Vigente</Text>
          </View>
        </View>

        <Text style={styles.closing}>
          Se extiende la presente constancia a solicitud de la parte interesada,
          para los usos que estime convenientes.
        </Text>

        <Text style={styles.date}>
          Fecha de emisión: {fechaGeneracion}
        </Text>

        <Text style={styles.footer}>
          SCAD-INTESS · Sistema de Control Académico y Disciplinario
        </Text>
      </Page>
    </Document>
  );
}

export default function ConstanciaPdfDownload({ constancia }: Props) {
  return (
    <PDFDownloadLink
      document={<ConstanciaDocument constancia={constancia} />}
      fileName={`Constancia_Matricula_${constancia.nie}_${constancia.anio}.pdf`}
      className="inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
    >
      {({ loading }) => loading ? "Preparando PDF..." : "Descargar constancia PDF"}
    </PDFDownloadLink>
  );
}
