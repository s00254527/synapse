 //this is a temparay model as I needed something for the api
 export interface NoteModel{
   id:string;
   title:string;
   FolderId?:number;
   UpdatedAt?:Date;
   IsDeleted?:boolean;
  content:string;
 }

 