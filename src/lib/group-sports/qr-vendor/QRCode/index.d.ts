declare class QRCode {
  constructor(typeNumber:number,errorCorrectLevel:number);
  modules:boolean[][];
  addData(content:string):void;
  make():void;
  getModuleCount():number;
  isDark(row:number,col:number):boolean;
}
export = QRCode;
