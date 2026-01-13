import { userApi } from "../API/api.js";
import { authService } from "../API/auth.js";
import { router } from "../router.js"
import { renderNavBar } from "./renderNavBar.js";
import { escapeHtml } from "../utils.js";
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export async function renderSettings(mainElement : HTMLElement){
    const logged = await authService.isValid();
    if (!logged){
        router.navigate('/home');
        return;
    }
    const userId = await authService.getUserId();
    if(userId === null){
        alert("erreur lors du recuperation du userId");
        router.navigate('/login');
        return ;
    }
    mainElement.innerHTML = `<div class="signup-container">
            <h1 class="registerH1">
                settings
            </h1>
            <div class="rounded-lg p-2">
                <div class="flex items-center justify-between">
                    <p class="text-black text-sm font-mono tracking-widest uppercase">
                    TWO-FACTOR AUTHENTICATION
                    </p>
                    <div class="flex items-center space-x-2">
                        <button id="2FAcheckbox" class="w-8 h-8 bg-white rounded-lg flex items-center justify-center border-2">
                            <svg class="w-5 h-5 text-white" fill="black" stroke="black" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            <form id="signupForm" class="registerForm">
                <div class="relative">
                    <div class="registerFormInputDiv">
                        <svg class="registerFormSvg" fill="currentColor" viewBox="0 0 20 20">
                            <path stroke-width="1" d="M7.5 11.875c-.292 0-.538-.1-.74-.302a1.006 1.006 0 0 1-.302-.74c0-.291.1-.538.302-.74.202-.2.448-.301.74-.301s.538.1.74.302c.2.201.301.448.301.74 0 .291-.1.537-.302.739a1.006 1.006 0 0 1-.74.302Zm5 0c-.292 0-.538-.1-.74-.302a1.006 1.006 0 0 1-.302-.74c0-.291.1-.538.302-.74.202-.2.448-.301.74-.301.291 0 .538.1.74.302.2.201.301.448.301.74 0 .291-.1.537-.302.739a1.006 1.006 0 0 1-.74.302ZM10 16.667c1.86 0 3.437-.646 4.729-1.938 1.292-1.291 1.938-2.868 1.938-4.729 0-.333-.021-.656-.063-.969a4.032 4.032 0 0 0-.23-.906 7.705 7.705 0 0 1-1.79.208A8.156 8.156 0 0 1 11 7.521 8.32 8.32 0 0 1 8.125 5.25a8.216 8.216 0 0 1-1.906 2.823 8.14 8.14 0 0 1-2.886 1.802V10c0 1.861.646 3.438 1.938 4.73 1.291 1.29 2.868 1.937 4.729 1.937Zm0 1.666a8.115 8.115 0 0 1-3.25-.656 8.416 8.416 0 0 1-2.646-1.781 8.415 8.415 0 0 1-1.781-2.646A8.115 8.115 0 0 1 1.667 10c0-1.21.218-2.236.656-3.25a8.836 8.836 0 0 1 1.87-2.779 8.836 8.836 0 0 1 2.778-1.87A8.52 8.52 0 0 1 10.5 1.75c1.21 0 2.348.218 3.412.656a8.416 8.416 0 0 1 2.646 1.781 8.415 8.415 0 0 1 1.78 2.646 8.115 8.115 0 0 1 .657 3.25 8.115 8.115 0 0 1-.656 3.25 8.415 8.415 0 0 1-1.781 2.646 8.416 8.416 0 0 1-2.646 1.781 8.114 8.114 0 0 1-3.25.656ZM8.875 3.437a6.68 6.68 0 0 0 2.375 2.344c1 .59 2.11.886 3.333.886.195 0 .382-.01.563-.032.18-.02.368-.045.562-.073a6.68 6.68 0 0 0-2.375-2.343c-1-.59-2.11-.886-3.333-.886-.195 0-.382.01-.563.032-.18.02-.368.045-.562.072ZM3.687 7.896a6.656 6.656 0 0 0 1.855-1.563 6.633 6.633 0 0 0 1.187-2.146A6.656 6.656 0 0 0 4.875 5.75a6.634 6.634 0 0 0-1.188 2.146Z"></path>
                        </svg>
                    </div>
                    <input class="registerFormInput" placeholder="New Username" type="text" id="username" name="username" required>
                </div>

                <div class="relative">
                    <div class="registerFormInputDiv">
                        <svg class="registerFormSvg" fill="currentColor" viewBox="0 0 21 21">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M10.5 19.25a8.52 8.52 0 0 1-3.412-.69 8.835 8.835 0 0 1-2.779-1.87 8.836 8.836 0 0 1-1.87-2.778A8.52 8.52 0 0 1 1.75 10.5c0-1.21.23-2.348.69-3.412a8.836 8.836 0 0 1 1.87-2.779 8.836 8.836 0 0 1 2.778-1.87A8.52 8.52 0 0 1 10.5 1.75c1.21 0 2.348.218 3.412.69a8.836 8.836 0 0 1 2.779 1.87 8.835 8.835 0 0 1 1.87 2.778 8.52 8.52 0 0 1 .689 3.412v1.269c0 .86-.295 1.593-.886 2.198-.59.605-1.316.908-2.177.908-.51 0-.991-.11-1.443-.328a3.084 3.084 0 0 1-1.138-.94c-.423.422-.9.74-1.433.95a4.49 4.49 0 0 1-1.673.318c-1.21 0-2.242-.427-3.095-1.28-.853-.853-1.28-1.885-1.28-3.095 0-1.21.427-2.242 1.28-3.095.853-.853 1.885-1.28 3.095-1.28 1.21 0 2.242.427 3.095 1.28.853.853 1.28 1.885 1.28 3.095v1.269c0 .379.124.7.372.962.248.263.561.394.94.394.38 0 .693-.131.941-.394a1.35 1.35 0 0 0 .372-.962V10.5c0-1.954-.678-3.61-2.034-4.966C14.109 4.178 12.454 3.5 10.5 3.5c-1.954 0-3.61.678-4.966 2.034C4.178 6.891 3.5 8.546 3.5 10.5c0 1.954.678 3.61 2.034 4.966C6.891 16.822 8.546 17.5 10.5 17.5h4.375v1.75H10.5Zm0-6.125c.73 0 1.349-.255 1.86-.766.51-.51.765-1.13.765-1.859 0-.73-.255-1.349-.766-1.86a2.531 2.531 0 0 0-1.859-.765c-.73 0-1.349.255-1.86.766-.51.51-.765 1.13-.765 1.859 0 .73.255 1.349.766 1.86.51.51 1.13.765 1.859.765"></path>
                        </svg>
                    </div>
                    <input class="registerFormInput" placeholder="New Email" type="email" id="email" name="email" required>
                </div>

                <div class="relative">
                    <div class="registerFormInputDiv">
                        <svg class="registerFormSvg" fill="currentColor" viewBox="0 0 22 22">
                            <path d="M6.417 16.5c-1.528 0-2.827-.535-3.896-1.604C1.45 13.826.917 12.528.917 11S1.45 8.174 2.52 7.104C3.59 6.034 4.889 5.5 6.417 5.5c1.008 0 1.932.252 2.772.756a5.664 5.664 0 0 1 1.994 1.994h9.9v5.5H19.25v2.75h-5.5v-2.75h-2.567a5.665 5.665 0 0 1-1.994 1.994 5.29 5.29 0 0 1-2.772.756Zm0-1.833c1.008 0 1.818-.31 2.429-.928.61-.62.977-1.227 1.1-1.822h5.637v2.75h1.833v-2.75h1.834v-1.834H9.946c-.123-.595-.49-1.203-1.1-1.822-.611-.618-1.421-.928-2.43-.928-1.008 0-1.871.36-2.59 1.077C3.11 9.128 2.75 9.992 2.75 11c0 1.008.359 1.871 1.077 2.59.718.718 1.581 1.077 2.59 1.077Zm0-1.834c.504 0 .935-.18 1.294-.538.36-.36.539-.79.539-1.295 0-.504-.18-.936-.539-1.295a1.765 1.765 0 0 0-1.295-.538c-.504 0-.935.18-1.294.538-.36.36-.539.79-.539 1.295 0 .504.18.936.539 1.295.359.359.79.538 1.295.538Z"></path>
                        </svg>
                    </div>
                    <input class="registerFormInput" placeholder="Actual Password" type="password" id="actualpassword" name="actualpassword" autocomplete="new-password" required>
                </div>

                <div class="relative">
                    <div class="registerFormInputDiv">
                        <svg class="registerFormSvg" fill="currentColor" viewBox="0 0 22 22">
                            <path d="M6.417 16.5c-1.528 0-2.827-.535-3.896-1.604C1.45 13.826.917 12.528.917 11S1.45 8.174 2.52 7.104C3.59 6.034 4.889 5.5 6.417 5.5c1.008 0 1.932.252 2.772.756a5.664 5.664 0 0 1 1.994 1.994h9.9v5.5H19.25v2.75h-5.5v-2.75h-2.567a5.665 5.665 0 0 1-1.994 1.994 5.29 5.29 0 0 1-2.772.756Zm0-1.833c1.008 0 1.818-.31 2.429-.928.61-.62.977-1.227 1.1-1.822h5.637v2.75h1.833v-2.75h1.834v-1.834H9.946c-.123-.595-.49-1.203-1.1-1.822-.611-.618-1.421-.928-2.43-.928-1.008 0-1.871.36-2.59 1.077C3.11 9.128 2.75 9.992 2.75 11c0 1.008.359 1.871 1.077 2.59.718.718 1.581 1.077 2.59 1.077Zm0-1.834c.504 0 .935-.18 1.294-.538.36-.36.539-.79.539-1.295 0-.504-.18-.936-.539-1.295a1.765 1.765 0 0 0-1.295-.538c-.504 0-.935.18-1.294.538-.36.36-.539.79-.539 1.295 0 .504.18.936.539 1.295.359.359.79.538 1.295.538Z"></path>
                        </svg>
                    </div>
                    <input class="registerFormInput" placeholder="New Password" type="password" id="password" name="password" autocomplete="new-password" required>
                </div>

                <div class="relative">
                    <div class="registerFormInputDiv flex flex-col">
                        <svg class="registerFormSvg mt-1.5" fill="currentColor" viewBox="0 0 22 22">
                            <path d="M6.417 16.5c-1.528 0-2.827-.535-3.896-1.604C1.45 13.826.917 12.528.917 11S1.45 8.174 2.52 7.104C3.59 6.034 4.889 5.5 6.417 5.5c1.008 0 1.932.252 2.772.756a5.664 5.664 0 0 1 1.994 1.994h9.9v5.5H19.25v2.75h-5.5v-2.75h-2.567a5.665 5.665 0 0 1-1.994 1.994 5.29 5.29 0 0 1-2.772.756Zm0-1.833c1.008 0 1.818-.31 2.429-.928.61-.62.977-1.227 1.1-1.822h5.637v2.75h1.833v-2.75h1.834v-1.834H9.946c-.123-.595-.49-1.203-1.1-1.822-.611-.618-1.421-.928-2.43-.928-1.008 0-1.871.36-2.59 1.077C3.11 9.128 2.75 9.992 2.75 11c0 1.008.359 1.871 1.077 2.59.718.718 1.581 1.077 2.59 1.077Zm0-1.834c.504 0 .935-.18 1.294-.538.36-.36.539-.79.539-1.295 0-.504-.18-.936-.539-1.295a1.765 1.765 0 0 0-1.295-.538c-.504 0-.935.18-1.294.538-.36.36-.539.79-.539 1.295 0 .504.18.936.539 1.295.359.359.79.538 1.295.538Z"></path>
                        </svg>
                        <svg class="registerFormSvg -mt-1.5" fill="currentColor" viewBox="0 0 22 22">
                            <path d="M6.417 16.5c-1.528 0-2.827-.535-3.896-1.604C1.45 13.826.917 12.528.917 11S1.45 8.174 2.52 7.104C3.59 6.034 4.889 5.5 6.417 5.5c1.008 0 1.932.252 2.772.756a5.664 5.664 0 0 1 1.994 1.994h9.9v5.5H19.25v2.75h-5.5v-2.75h-2.567a5.665 5.665 0 0 1-1.994 1.994 5.29 5.29 0 0 1-2.772.756Zm0-1.833c1.008 0 1.818-.31 2.429-.928.61-.62.977-1.227 1.1-1.822h5.637v2.75h1.833v-2.75h1.834v-1.834H9.946c-.123-.595-.49-1.203-1.1-1.822-.611-.618-1.421-.928-2.43-.928-1.008 0-1.871.36-2.59 1.077C3.11 9.128 2.75 9.992 2.75 11c0 1.008.359 1.871 1.077 2.59.718.718 1.581 1.077 2.59 1.077Zm0-1.834c.504 0 .935-.18 1.294-.538.36-.36.539-.79.539-1.295 0-.504-.18-.936-.539-1.295a1.765 1.765 0 0 0-1.295-.538c-.504 0-.935.18-1.294.538-.36.36-.539.79-.539 1.295 0 .504.18.936.539 1.295.359.359.79.538 1.295.538Z"></path>
                        </svg>
                    </div>
                    <input class="registerFormInput" placeholder="Confirm New Password" type="password" id="confirmPassword" name="confirmPassword" autocomplete="new-password" required>
                </div>
                <div class="updateAvatarDiv">
                    <div class="flex items-center space-x-3 -ml-3">
                        <div id="avatarClick" class="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                            <svg class="h-5 w-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18 15.75C18 17.4833 17.3917 18.9583 16.175 20.175C14.9583 21.3917 13.4833 22 11.75 22C10.0167 22 8.54167 21.3917 7.325 20.175C6.10833 18.9583 5.5 17.4833 5.5 15.75V6.5C5.5 5.25 5.9375 4.1875 6.8125 3.3125C7.6875 2.4375 8.75 2 10 2C11.25 2 12.3125 2.4375 13.1875 3.3125C14.0625 4.1875 14.5 5.25 14.5 6.5V15.25C14.5 16.0167 14.2333 16.6667 13.7 17.2C13.1667 17.7333 12.5167 18 11.75 18C10.9833 18 10.3333 17.7333 9.8 17.2C9.26667 16.6667 9 16.0167 9 15.25V6H11V15.25C11 15.4667 11.0708 15.6458 11.2125 15.7875C11.3542 15.9292 11.5333 16 11.75 16C11.9667 16 12.1458 15.9292 12.2875 15.7875C12.4292 15.6458 12.5 15.4667 12.5 15.25V6.5C12.4833 5.8 12.2375 5.20833 11.7625 4.725C11.2875 4.24167 10.7 4 10 4C9.3 4 8.70833 4.24167 8.225 4.725C7.74167 5.20833 7.5 5.8 7.5 6.5V15.75C7.48333 16.9333 7.89167 17.9375 8.725 18.7625C9.55833 19.5875 10.5667 20 11.75 20C12.9167 20 13.9083 19.5875 14.725 18.7625C15.5417 17.9375 15.9667 16.9333 16 15.75V6H18V15.75Z" fill="white" fill-opacity="0.9"/>
                            </svg>
                            <input type="file" id="profilePic" accept="image/*" style="display: none;" />
                            <img id="preview" src="" alt="Preview" style="display: none;" width="150" />
                            </div>
                            <span class="text-black text-sm">NEW AVATAR</span>
                </div>
                <button id="submitButton" type="button" class="w-10 h-10 bg-black rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.1422 21L4.49219 14.35L6.15469 12.6875L11.1422 17.675L21.8464 6.97083L23.5089 8.63333L11.1422 21Z" fill="white" fill-opacity="0.9"/>
                        </svg>
                </button>
                </div>
                <div class="flex justify-center">
                <button id="logoutButton" type="button" class="flex items-center justify-center gap-2 bg-white border-2 border-gray-800 text-gray-800 font-semibold px-6 py-3 rounded-full hover:bg-gray-800 hover:text-white transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:scale-105">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    <span class="text-sm font-bold tracking-wide">LOGOUT</span>
                </button>
                </div>
            </form>
        </div>
    `;
    const logoutButton = document.getElementById("logoutButton");
    if(logoutButton){
        logoutButton.addEventListener("click", async (e: Event) => {
            e.stopPropagation();    
            e.preventDefault();
            e.stopPropagation();
            const userId = await authService.getUserId();
            if(userId){
                await userApi.logout(userId);
            }
            //SET USER TO OFFLINE
            authService.setAccessToken(null);
            router.navigate("/");
            await renderNavBar();
        });
    }
    const checkbox = document.getElementById("2FAcheckbox");
    if(checkbox){
        const response = await userApi.TwoFaIsActive(userId);
        const isActivated = response.bool;
        //console.log(`response.bool : ${response.bool}`);
        if(response.bool === false){
            const buttonData = checkbox.setAttribute("data-active", "false");
            setTwoFaInactiveStyle(checkbox);
        }
        else{
            const buttonData = checkbox.setAttribute("data-active", "true");
            setTwoFaActiveStyle(checkbox);
        }
        checkbox.addEventListener('click', async()=>{
            try{
                const buttonData = checkbox.getAttribute("data-active");
                const booleanData = buttonData?.toLowerCase() === "true";
                //console.log(`booleanData : ${booleanData}`);
                const response = await userApi.changeTwoFaOption(userId, booleanData);
                // console.log(`response : `);
                // console.log(response);
                if(buttonData === "false"){
                    checkbox.setAttribute("data-active", "true");
                    setTwoFaActiveStyle(checkbox);
                }
                else{
                    checkbox.setAttribute("data-active", "false");
                    setTwoFaInactiveStyle(checkbox);
                }
            }
            catch(err){
                alert(err);
            }
        })
        const submitButton = document.getElementById("submitButton");
        const form = document.getElementById("signupForm") as HTMLFormElement;
        
        const input = document.getElementById('profilePic') as HTMLInputElement | null;
        const avatarClick = document.getElementById('avatarClick');
        if (form && submitButton) {
          
          submitButton.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const status = document.getElementById("status");
        
            const formData = new FormData(form);
        
            // Avatar fichier via champ file
            const fileInput = document.getElementById("profilePic") as HTMLInputElement;
            const avatarFile = fileInput?.files?.[0];
        
            if (avatarFile) {
              formData.append("profilePic", avatarFile);
              try {
                await userApi.UploadProfilAvatar(userId, formData);
              } catch (err) {
                alert(`Erreur de téléversement avatar : ${err}`);
                return;
              }
            }
        
            try {
              const username = formData.get("username") as string;
              const email = formData.get("email") as string;
              const actualPass = formData.get("actualpassword") as string;
              const password = formData.get("password") as string;
              const confirmPassword = formData.get("confirmPassword") as string;
              const avatar = formData.get("avatar") as string;
        
              let Escpaeusername = "";
              let Escpaeemail = "";
              let Escpaeavatar = "";
        
              if (username) Escpaeusername = escapeHtml(username);
              if (email) Escpaeemail = escapeHtml(email);
              if (avatar) Escpaeavatar = escapeHtml(avatar);
        
              if (Escpaeusername || Escpaeemail || Escpaeavatar) {
                //console.log("Updating user info...");
                if(Escpaeavatar){
                    //console.log(Escpaeavatar);
                    Escpaeavatar = (process.env.ENV_NODE === "production" ? "https://" : "http://") + "localhost:3000" + Escpaeavatar;
                    //console.log(Escpaeavatar);
                    await userApi.updateUser(userId, {avatar_url : Escpaeavatar});
                }
                if(Escpaeemail){
                    await userApi.updateUser(userId, {email : Escpaeemail});
                }
                if(Escpaeusername){
                    await userApi.updateUser(userId, {username : Escpaeusername});
                }
              }
        
              if (actualPass || password || confirmPassword) {
                if (password && confirmPassword && actualPass) {
                  if (password === confirmPassword) {
                    const response = await userApi.updatePassword(userId, {
                      actualPass: actualPass,
                      newPass: password,
                    });
                    if (response && status) {
                      status.textContent = "Password updated successfully";
                    }
                  } else {
                    if (status) status.textContent = "Password and confirm password do not match";
                  }
                } else {
                  if (status)
                    status.textContent = "Need oldpassword, new password and confirnew password to process the update";
                }
              }
              form.reset();
              fileInput.value = "";

              // 2. Réinitialiser l'image affichée
              const preview = document.getElementById('preview') as HTMLImageElement | null;
              if(input && preview){
                input.src = "";
                preview.src = "";
                preview.style.display = "none";
              }
              await renderNavBar();
              if(status){
                status.innerHTML = `Update Done`
              }
            } catch (err) {
              if (status) status.textContent = `${err}`;
            }
          });
        }

    if (input && avatarClick) {
        avatarClick.addEventListener('click', () => {
        input.click(); // déclenche la boîte de sélection de fichier
        });
        input.addEventListener('change', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        const preview = document.getElementById('preview') as HTMLImageElement | null;

        if (file && preview) {
            const reader = new FileReader();
            reader.onload = (event: ProgressEvent<FileReader>) => {
                const result = event.target?.result;
                if (typeof result === 'string') {
                    preview.src = result;
                    preview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        }
    });
}
}

function setTwoFaInactiveStyle(button: HTMLElement) {
    button.classList.add('bg-white', 'border-black');
    button.classList.remove('bg-black', 'border-white');
    button.innerHTML = `
        <svg class="w-5 h-5 text-black" fill="black" stroke="black" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
    `;
}

function setTwoFaActiveStyle(button: HTMLElement) {
    button.classList.remove('bg-white', 'border-black');
    button.classList.add('bg-black', 'border-black');
    button.innerHTML = `
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>`;  
}
}