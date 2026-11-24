"use client";

import {
  Document,
  Page,
  PDFDownloadLink,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

interface BoletaPDFProps {
  boleta: {
    anio: number;
    estudiante: {
      nie: number;
      nombre: string;
      grado: number;
      seccion: string;
      especialidad: string;
    };
    periodo: {
      numero: number;
      fecha_inicio: string;
      fecha_cierre: string;
    };
    materias: {
      cod_materia: string;
      materia: string;
      act1: number | null;
      act2: number | null;
      examen: number | null;
      promedio: number | null;
      riesgo_academico: boolean;
    }[];
  };
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 38,
    paddingBottom: 42,
    paddingHorizontal: 42,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1e293b",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#1d4ed8",
    paddingBottom: 14,
    marginBottom: 18,
    alignItems: "center",
  },
  institution: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#173b70",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 9,
    color: "#475569",
  },
  reportTitle: {
    marginTop: 13,
    fontSize: 14,
    fontWeight: "bold",
    color: "#173b70",
  },
  period: {
    marginTop: 5,
    fontSize: 9,
    color: "#475569",
  },
  generated: {
    marginTop: 5,
    fontSize: 8,
    color: "#64748b",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#173b70",
    marginBottom: 9,
  },
  studentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  studentField: {
    width: "50%",
    marginBottom: 12,
    paddingRight: 8,
  },
  fieldLabel: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 3,
  },
  fieldValue: {
    fontSize: 9,
    fontWeight: "bold",
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#173b70",
    paddingVertical: 9,
    paddingHorizontal: 5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 9,
    paddingHorizontal: 5,
  },
  materia: {
    width: "32%",
    fontSize: 8,
  },
  nota: {
    width: "13%",
    textAlign: "center",
    fontSize: 8,
  },
  risk: {
    width: "16%",
    textAlign: "center",
    fontSize: 8,
  },
  emptyRow: {
    paddingVertical: 18,
    paddingHorizontal: 10,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 0.6,
    borderBottomColor: "#cbd5e1",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 9,
    color: "#64748b",
    textAlign: "center",
  },
  notice: {
    marginTop: 15,
    padding: 9,
    backgroundColor: "#eff6ff",
    color: "#1e40af",
    fontSize: 8,
  },
  signatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 65,
  },
  signature: {
    width: "42%",
    borderTopWidth: 0.8,
    borderTopColor: "#64748b",
    paddingTop: 7,
    textAlign: "center",
    fontSize: 8,
    color: "#475569",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 42,
    right: 42,
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    paddingTop: 7,
    textAlign: "center",
    fontSize: 7,
    color: "#64748b",
  },
});

function nota(valor: number | null): string {
  return valor === null ? "Pendiente" : valor.toFixed(2);
}

function BoletaDocument({ boleta }: BoletaPDFProps) {
  const fechaGeneracion = new Date().toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={`Boleta ${boleta.estudiante.nie} - ${boleta.anio}`}
      author="SCAD-INTESS"
      subject="Boleta de calificaciones"
    >
      <Page size="LETTER" orientation="portrait" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.institution}>SCAD-INTESS</Text>
          <Text style={styles.subtitle}>
            Instituto Nacional Tecnológico de San Salvador
          </Text>
          <Text style={styles.reportTitle}>BOLETA DE CALIFICACIONES</Text>
          <Text style={styles.period}>
            Ciclo escolar {boleta.anio} · Período {boleta.periodo.numero}
          </Text>
          <Text style={styles.generated}>
            Fecha de generación: {fechaGeneracion}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>INFORMACIÓN DEL ESTUDIANTE</Text>

        <View style={styles.studentGrid}>
          <View style={styles.studentField}>
            <Text style={styles.fieldLabel}>Nombre del estudiante</Text>
            <Text style={styles.fieldValue}>{boleta.estudiante.nombre}</Text>
          </View>

          <View style={styles.studentField}>
            <Text style={styles.fieldLabel}>NIE</Text>
            <Text style={styles.fieldValue}>
              {boleta.estudiante.nie}
            </Text>
          </View>

          <View style={styles.studentField}>
            <Text style={styles.fieldLabel}>Grado y sección</Text>
            <Text style={styles.fieldValue}>
              {boleta.estudiante.grado}° {boleta.estudiante.seccion}
            </Text>
          </View>

          <View style={styles.studentField}>
            <Text style={styles.fieldLabel}>Especialidad</Text>
            <Text style={styles.fieldValue}>
              {boleta.estudiante.especialidad}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>REGISTRO DE CALIFICACIONES</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.materia, { color: "#ffffff" }]}>Materia</Text>
            <Text style={[styles.nota, { color: "#ffffff" }]}>Act. 1</Text>
            <Text style={[styles.nota, { color: "#ffffff" }]}>Act. 2</Text>
            <Text style={[styles.nota, { color: "#ffffff" }]}>Examen</Text>
            <Text style={[styles.nota, { color: "#ffffff" }]}>Promedio</Text>
            <Text style={[styles.risk, { color: "#ffffff" }]}>Riesgo</Text>
          </View>

          {boleta.materias.length > 0 ? (
            boleta.materias.map((materia) => (
              <View style={styles.tableRow} key={materia.cod_materia}>
                <Text style={styles.materia}>{materia.materia}</Text>
                <Text style={styles.nota}>{nota(materia.act1)}</Text>
                <Text style={styles.nota}>{nota(materia.act2)}</Text>
                <Text style={styles.nota}>{nota(materia.examen)}</Text>
                <Text style={styles.nota}>{nota(materia.promedio)}</Text>
                <Text style={styles.risk}>
                  {materia.riesgo_academico ? "Sí" : "No"}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>
                No hay materias registradas en la carga académica de esta sección.
              </Text>
            </View>
          )}
        </View>

        {boleta.materias.length === 0 && (
          <Text style={styles.notice}>
            Este documento refleja la información disponible en el sistema al
            momento de su generación. No existen materias cargadas para este
            estudiante en el período seleccionado.
          </Text>
        )}

        <View style={styles.signatures}>
          <Text style={styles.signature}>Firma del docente</Text>
          <Text style={styles.signature}>Firma de Dirección</Text>
        </View>

        <Text style={styles.footer}>
          SCAD-INTESS · Sistema de Control Académico y Disciplinario
        </Text>
      </Page>
    </Document>
  );
}

export default function BoletaPdfDownload({ boleta }: BoletaPDFProps) {
  return (
    <PDFDownloadLink
      document={<BoletaDocument boleta={boleta} />}
      fileName={`Boleta_${boleta.estudiante.nie}_${boleta.anio}_P${boleta.periodo.numero}.pdf`}
      className="inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
    >
      {({ loading }) => (loading ? "Preparando PDF..." : "Descargar PDF")}
    </PDFDownloadLink>
  );
}
