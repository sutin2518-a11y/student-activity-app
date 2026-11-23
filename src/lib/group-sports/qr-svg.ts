// Offline QR generation: no third-party network, no new npm dependency.
// The vendored algorithm is MIT-licensed (see qr-vendor/LICENSE.txt).
import QRCode from "./qr-vendor/QRCode";
export function qrSvgDataUri(value:string): string {
  const code = new QRCode(-1,0); // error-correction level M
  code.addData(value);
  code.make();
  const size = code.getModuleCount();
  const margin = 4;
  const dots:string[]=[];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    if(code.isDark(y,x))dots.push(`M${x+margin},${y+margin}h1v1h-1z`);
  }
  const dimension=size+margin*2;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" shape-rendering="crispEdges"><path fill="#fff" d="M0 0h${dimension}v${dimension}H0z"/><path fill="#000" d="${dots.join(" ")}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
