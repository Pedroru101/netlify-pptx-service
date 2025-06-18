const serverless = require('serverless-http');
const express = require('express');
const PptxGenJS = require('pptxgenjs');

// Creamos una app de Express, igual que antes
const app = express();
app.use(express.json({ limit: '10mb' })); // Aumentamos el límite por si los datos son grandes

const router = express.Router();

// Handler para solicitudes GET en la raíz del function
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Envía un POST a esta ruta con datosReporte y chartList para generar PPTX.' });
});

// Definimos la ruta DENTRO del router de Express
router.post('/', async (req, res) => {
  try {
    const { datosReporte, chartList } = req.body;

    if (!datosReporte) {
      return res.status(400).json({ error: 'El objeto datosReporte es requerido.' });
    }

    let pres = new PptxGenJS();
    
    // --- DIAPOSITIVA DE TÍTULO ---
    let slideTitulo = pres.addSlide();
    slideTitulo.addText('Análisis de Repercusión Mediática', { x: 0.5, y: 1.5, w: '90%', h: 1, fontSize: 36, bold: true, color: '363636', align: 'center' });
    slideTitulo.addText(`Periodo: ${datosReporte.fechaInicial} a ${datosReporte.fechaFinal}`, { x: 0.5, y: 2.5, w: '90%', h: 0.75, fontSize: 24, color: '808080', align: 'center' });

    // --- DIAPOSITIVA DE RESUMEN CON TABLA ---
    let slideResumen = pres.addSlide();
    slideResumen.addText('Resumen Total de la Repercusión', { x: 0.5, y: 0.25, w: '90%', h: 0.5, fontSize: 24, bold: true });
    
    const tableRows = [[{ text: 'Medios', options: { bold: true, fill: 'F2F2F2' } }, { text: 'Noticias', options: { bold: true, fill: 'F2F2F2' } }, { text: 'VPE (€)', options: { bold: true, fill: 'F2F2F2' } }, { text: 'VC (€)', options: { bold: true, fill: 'F2F2F2' } }, { text: 'Audiencia', options: { bold: true, fill: 'F2F2F2' } }]];
    const mediaTypes = ['Medios Digitales', 'Prensa', 'TV', 'Radio'];
    mediaTypes.forEach(medio => {
        if (datosReporte[medio]) {
            tableRows.push([medio, datosReporte[medio].cantidad_noticias.toString(), datosReporte[medio].total_vpe.toString() + ' €', datosReporte[medio].total_vc.toString() + ' €', datosReporte[medio].total_audiencia.toString()]);
        }
    });
    tableRows.push([{ text: 'Total', options: { bold: true, fill: 'F2F2F2' } }, { text: datosReporte.totalGlobalNoticias.toString(), options: { bold: true, fill: 'F2F2F2' } }, { text: datosReporte.totalGlobalVPE.toString() + ' €', options: { bold: true, fill: 'F2F2F2' } }, { text: datosReporte.totalGlobalVC.toString() + ' €', options: { bold: true, fill: 'F2F2F2' } }, { text: datosReporte.totalGlobalAudiencia.toString(), options: { bold: true, fill: 'F2F2F2' } }]);
    slideResumen.addTable(tableRows, { x: 0.5, y: 1.0, w: 9.0, border: { type: 'solid', pt: 1, color: '663399' }, align: 'center', fontSize: 11, colW: [3, 1.5, 1.5, 1.5, 1.5] });

    // --- DIAPOSITIVAS PARA GRÁFICOS ---
    if (chartList && chartList.length > 0) {
        chartList.forEach(chart => {
            if (chart.url && chart.title) {
                let slideGrafico = pres.addSlide();
                slideGrafico.addText(chart.title, { x: 0.5, y: 0.2, w: '90%', h: 0.5, fontSize: 20, bold: true, align: 'center' });
                slideGrafico.addImage({ path: chart.url, x: 1, y: 1, w: 8, h: 4.5 });
            }
        });
    }

    const buffer = await pres.write('buffer');

    res.setHeader('Content-Disposition', 'attachment; filename=reporte.pptx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Error en la función:", error);
    res.status(500).json({ error: 'Hubo un error al generar la presentación.' });
  }
});

// Le indicamos a la app de Express que use el router en una ruta base.
// El nombre del archivo (generate-pptx) será parte de la URL final.
app.use('/.netlify/functions/generate-pptx', router);

// Exportamos el manejador que Netlify necesita
module.exports.handler = serverless(app);