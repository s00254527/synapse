 export interface NoteModel{
   NoteId:bigint;
   VaultId:number;
   FolderId:number;
   Title:string;
   Contenet:string;
   CreatedAt:Date;
   UpdatedAt:Date;
   IsDeleted:boolean;
   Keys:string;

 }

 