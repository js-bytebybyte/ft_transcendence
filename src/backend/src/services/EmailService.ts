import nodemailer from 'nodemailer';
import { db } from '../database.js';

// console.log("=== EmailService.ts chargé ===");

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // ou votre serveur SMTP
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER, // votre email
    pass: process.env.EMAIL_PASS  // votre mot de passe ou app password
  }
});

export function generateRandomCode(length: number): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    const digit = Math.floor(Math.random() * 9) + 1;
    code += digit.toString();
  }
  return code;
}

export async function sendEmail(
  to: string, 
  subject: string, 
  text: string, 
  html?: string
) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      text: text,
      html: html || text
    };

    const info = await transporter.sendMail(mailOptions);
    //console.log('Email envoyé:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return { success: false, error: error };
  }
}

export async function storeRandomCode(RandomCode: string, email: string) {
  //console.log(`Code: ${RandomCode}, Email: ${email}`);
  
  return new Promise((resolve, reject) => {
    if (!RandomCode || !email) {
      console.error("Code ou email manquant");
      return reject(new Error("Missing code or email"));
    }
    
    const numericCode = parseInt(RandomCode, 10);
    //console.log(`Code converti en nombre: ${numericCode}`);
    
    db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
      if (err) {
        //console.error(`Erreur lors de la vérification de l'email: ${err.message}`);
        return reject(err);
      }
      
      if (!row) {
        //console.error(`Aucun utilisateur trouvé avec l'email: ${email}`);
        return resolve({ success: false, reason: "User not found" });
      }
      
      const query = `UPDATE users SET twofa = ? WHERE email = ?`;
      db.run(query, [numericCode, email], function(err) {
        if (err) {
          //console.error(`Erreur lors de la mise à jour: ${err.message}`);
          return reject(err);
        }
        
        //console.log(`Mise à jour effectuée. Lignes modifiées: ${this.changes}`);
        resolve({
          success: this.changes > 0,
          changes: this.changes,
          code: numericCode
        });
      });
    });
  }).catch(err => {
    throw err;
  }).finally(() => {
  });
}

export async function getStoredCode(email : string){
  return new Promise((resolve, reject) => {
    const query = `SELECT twofa FROM users WHERE email = ?`;
    try{
      db.get(query, [email], (err, row: any)=>{
        if(err){
          return reject(err);
        }
        if(!row){
          return resolve(null);
        }
        resolve(row.twofa);
      })
    }
    catch(err){
      reject(err);
    }

  })
}