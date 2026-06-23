import React from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { createRoot } from 'react-dom/client';
import { ReportCardsPdfPage } from './StudentReportCard';

const waitForImages = async (container) => {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );
};

const chunkPairs = (items) => {
  const pairs = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push(items.slice(i, i + 2));
  }
  return pairs;
};

/**
 * Build a single PDF with two report cards per A4 page.
 * @param {object[]} reportDataList - output of buildStudentReportData per student
 * @returns {Promise<Blob>}
 */
export async function buildReportCardsPdfBlob(reportDataList) {
  const pairs = chunkPairs(reportDataList || []);
  if (pairs.length === 0) {
    throw new Error('No report cards to generate.');
  }

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const pdf = new jsPDF('p', 'mm', 'a4');

  for (let pageIndex = 0; pageIndex < pairs.length; pageIndex++) {
    const mountNode = document.createElement('div');
    mountNode.style.position = 'fixed';
    mountNode.style.left = '-10000px';
    mountNode.style.top = '0';
    mountNode.style.width = '794px';
    mountNode.style.background = '#ffffff';
    mountNode.style.zIndex = '-1';
    document.body.appendChild(mountNode);

    const root = createRoot(mountNode);
    root.render(<ReportCardsPdfPage cards={pairs[pageIndex]} />);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await waitForImages(mountNode);

    const canvas = await html2canvas(mountNode, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    root.unmount();
    document.body.removeChild(mountNode);

    const imgWidth = usableWidth;
    const imgHeightMm = (canvas.height * imgWidth) / canvas.width;

    if (pageIndex > 0) pdf.addPage();

    const sliceData = canvas.toDataURL('image/png');
    const drawHeight = Math.min(imgHeightMm, usableHeight);
    pdf.addImage(sliceData, 'PNG', margin, margin, imgWidth, drawHeight);
  }

  return pdf.output('blob');
}
