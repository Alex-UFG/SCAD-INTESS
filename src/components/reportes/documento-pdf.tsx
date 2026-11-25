import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';

export interface DocumentoPdfDatos {
  institucion: string;
  lema: string;
  titulo: string;
  subtitulos: string[];
  parrafoInicial?: string;
  datos: { label: string; value: string }[];
  tabla?: { columnas: string[]; filas: string[][]; vacio: string };
  parrafoFinal?: string;
  firmas: string[];
}

const INTESS = '#1e4b8f';
const INTESS_DARK = '#0f2a52';
const GRIS = '#475569';
const BORDE = '#cbd5e1';

const s = StyleSheet.create({
  page: { paddingVertical: 40, paddingHorizontal: 44, fontSize: 10, fontFamily: 'Helvetica', color: '#000000', lineHeight: 1.5 },
  header: { borderBottomWidth: 1.5, borderBottomColor: INTESS, paddingBottom: 10, textAlign: 'center' },
  institucion: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: INTESS_DARK, textTransform: 'uppercase' },
  lema: { fontSize: 8, color: GRIS },
  titulo: { marginTop: 12, fontSize: 13, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  subtitulo: { fontSize: 8, color: GRIS },
  parrafo: { marginTop: 18, textAlign: 'justify' },
  datos: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 0.8, borderColor: BORDE, borderRadius: 3, paddingHorizontal: 10, paddingTop: 8 },
  dato: { width: '50%', marginBottom: 8 },
  datoLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRIS, textTransform: 'uppercase' },
  datoValue: { fontFamily: 'Helvetica-Bold' },
  tabla: { marginTop: 18 },
  filaHeader: { flexDirection: 'row', backgroundColor: INTESS, color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 8, textTransform: 'uppercase' },
  fila: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDE },
  celdaPrincipal: { flex: 3, paddingVertical: 5, paddingHorizontal: 6 },
  celda: { flex: 1, paddingVertical: 5, paddingHorizontal: 4, textAlign: 'center' },
  vacio: { paddingVertical: 16, textAlign: 'center', color: GRIS },
  firmas: { marginTop: 'auto', paddingTop: 60, flexDirection: 'row', justifyContent: 'space-around' },
  firma: { width: '40%', borderTopWidth: 0.8, borderTopColor: '#000000', paddingTop: 6, textAlign: 'center', fontSize: 8 },
});

function DocumentoPdf({ d }: { d: DocumentoPdfDatos }) {
  return (
    <Document title={d.titulo} author={d.institucion}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <Text style={s.institucion}>{d.institucion}</Text>
          <Text style={s.lema}>{d.lema}</Text>
          <Text style={s.titulo}>{d.titulo}</Text>
          {d.subtitulos.map((t) => (
            <Text key={t} style={s.subtitulo}>{t}</Text>
          ))}
        </View>

        {d.parrafoInicial && <Text style={s.parrafo}>{d.parrafoInicial}</Text>}

        <View style={s.datos}>
          {d.datos.map((x) => (
            <View key={x.label} style={s.dato}>
              <Text style={s.datoLabel}>{x.label}</Text>
              <Text style={s.datoValue}>{x.value}</Text>
            </View>
          ))}
        </View>

        {d.tabla && (
          <View style={s.tabla}>
            <View style={s.filaHeader}>
              {d.tabla.columnas.map((c, i) => (
                <Text key={c} style={i ? s.celda : s.celdaPrincipal}>{c}</Text>
              ))}
            </View>
            {d.tabla.filas.map((fila) => (
              <View key={fila[0]} style={s.fila} wrap={false}>
                {fila.map((v, i) => (
                  <Text key={i} style={i ? s.celda : s.celdaPrincipal}>{v}</Text>
                ))}
              </View>
            ))}
            {d.tabla.filas.length === 0 && <Text style={s.vacio}>{d.tabla.vacio}</Text>}
          </View>
        )}

        {d.parrafoFinal && <Text style={s.parrafo}>{d.parrafoFinal}</Text>}

        <View style={s.firmas} wrap={false}>
          {d.firmas.map((f) => (
            <Text key={f} style={s.firma}>{f}</Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export function generarPdf(datos: DocumentoPdfDatos): Promise<Blob> {
  return pdf(<DocumentoPdf d={datos} />).toBlob();
}
