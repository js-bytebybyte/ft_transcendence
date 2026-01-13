import { userApi } from "./api.js";
import { router } from "../router.js";
import { jwtDecode, JwtPayload } from 'jwt-decode';

interface CustomJwtPayload extends JwtPayload {
    id?: string;
}

export class AuthService {
    private AccessToken : string | null = null;
    private FireBaseToken : string | null = null;
    
    constructor(){
        this.AccessToken = null;
        this.FireBaseToken = null;
    }
    
    setAccessToken(AccessToken : string | null){
        this.AccessToken = AccessToken
    }

    setFireBaseToken(FirebaseToken : string | null){
        this.FireBaseToken = FirebaseToken
    }
    
    getAccessToken(): string | null{
        return this.AccessToken;
    }

    getFireBaseToken() : string | null {
        return this.FireBaseToken;
    }

    async getUserId(): Promise<string | null>{
        if(!this.AccessToken){
            try{
                await this.refreshToken();
            }
            catch(err){
                //console.log("Erreur 211");
                return null;
            }
        }
        try{
            const tmp = this.getAccessToken();
            if(!tmp){
                return null;
            }
            const decoded = jwtDecode<CustomJwtPayload>(tmp);
            //console.log(decoded);
            if(!decoded.id){
                //console.log("ca n'existe pas");
                return null;
            }
            return decoded.id;
        }
        catch(err){
            //console.log("Erreur 216");
            return null;
        }
    }
    
    async refreshToken(): Promise<void>{
        try{
            const {AccessToken} = await userApi.getAccessToken();
            if(!AccessToken){
                alert("Vous devez vous reconnectez");
                const userId = await this.getUserId();
                if(!userId){
                    throw 'No user id found';
                }
                await userApi.logout(userId);
                this.AccessToken = null;
                router.navigate('/login');
                throw 'No access token found';
            }
            //console.log("new access TOKEN")
            //console.log(AccessToken);
            this.AccessToken = AccessToken;
        }
        catch(err){
            //console.log("Erreur 218");
            this.AccessToken = null;
            throw 'No access token found';
        }
    }
    async isExpired(): Promise<boolean> {
        if (!this.AccessToken) {
          return false;
        }
      
        try {
          const decoded = jwtDecode<JwtPayload>(this.AccessToken);
          if (!decoded.exp) return false;
      
          const currentTime = Math.floor(Date.now() / 1000);
          const margin = 0;
      
          return (decoded.exp - margin) > currentTime;
        } catch (err) {
          //console.log("Token invalide");
          return false;
        }
      }
    async isValid(): Promise<boolean>{
        //console.log(`voici mon isValid accestoken comp = ${this.AccessToken}`)
        if(!this.AccessToken){
            try{
                await this.refreshToken();
            }
            catch(err){
                //console.log("Erreur 212");
                return false;
            }
            return true;
        }
        try{
            const decoded = jwtDecode<JwtPayload>(this.AccessToken);
            if(!decoded.exp){
                return false;
            }
            const currentTime = Math.floor(Date.now() / 1000);
            //console.log(`currentTime ${currentTime}`);
            //console.log(`decoded.exp ${decoded.exp}`);
            if(decoded.exp > currentTime){
                //console.log("token pas encore EXPIRE")
                return true;
            }
            try{
                //console.log("token EXPIRE");
                await this.refreshToken();
                return false;
            }
            catch(err){
                //console.log("Error refresh token")
                return false;
            }
        }
        catch(err){
            //console.log("Error validity of access token")
            return false;
        }
    }
}

export const authService = new AuthService();