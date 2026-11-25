 export interface NoteModel{
   id:string;
   title:string;
   FolderId?:number;
   UpdatedAt?:Date;
   IsDeleted?:boolean;
  content:string;
 }

 