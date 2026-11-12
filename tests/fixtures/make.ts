// Builds test PDFs that hide secrets in many places a careless tool would leak.
import { PDFDocument, PDFName, PDFString, StandardFonts, degrees } from 'pdf-lib';

export const SECRETS = {
  page1: 'SECRETALPHA123',
  page3: 'SECRETGAMMA789',
  title: 'SECRETTITLE',
  attachment: 'SECRETATTACH',
};

export async function makeSample(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(SECRETS.title);
  doc.setAuthor('Max Mustermann');
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const p1 = doc.addPage([595, 842]);
  p1.drawText('PUBLIC TEXT ONE', { x: 50, y: 760, size: 18, font });
  p1.drawText(SECRETS.page1, { x: 50, y: 700, size: 18, font });
  p1.drawText('mail: max@example.com', { x: 50, y: 650, size: 14, font });

  const p2 = doc.addPage([595, 842]);
  p2.drawText('PAGE TWO STAYS', { x: 50, y: 760, size: 18, font });

  const p3 = doc.addPage([842, 595]);
  p3.drawText(SECRETS.page3, { x: 50, y: 500, size: 18, font });

  const p4 = doc.addPage([595, 842]);
  p4.setRotation(degrees(90));
  p4.drawText('ROTATED PAGE', { x: 50, y: 760, size: 18, font });

  // A link on page 2 that points to page 3. Copying page 2 naively would
  // drag page 3 (and its secret) into the output.
  const link = doc.context.register(
    doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [50, 700, 300, 730],
      Border: [0, 0, 0],
      Dest: [p3.ref, 'Fit'],
    }),
  );
  p2.node.set(PDFName.of('Annots'), doc.context.obj([link]));
  // Private application data on page 2 that should not survive.
  p2.node.set(PDFName.of('PieceInfo'), doc.context.obj({ X: PDFString.of(SECRETS.page3) }));

  await doc.attach(new TextEncoder().encode(SECRETS.attachment), 'secret.txt', { mimeType: 'text/plain' });
  return doc.save({ useObjectStreams: false });
}
