import { userApi } from "../API/api.js";
import { router } from "../router.js";
import { authService } from "../API/auth.js";
import { renderNavBar } from "./renderNavBar.js";
import { connectWebSocket } from "../API/mysocket.js";;

export async function handle2FA(mainElement : HTMLElement, userID?: number): Promise<any> {
    //console.log("NOUS VOICI DANS HANDLE2FA");
    mainElement.innerHTML = `
        <div class="min-h-screen bg-white from-blue-50 to-indigo-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8">
                <!-- Container principal avec design moderne -->
                <div class="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                    <!-- En-tête avec icône -->
                    <div class="text-center mb-8">
                        <div class="mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4">
                            <svg class="h-8 w-8 text-black" fill="white" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                            </svg>
                        </div>
                        <h1 class="text-2xl font-bold text-gray-900 mb-2">Vérification requise</h1>
                        <p class="text-gray-600 text-sm leading-relaxed">
                            Un code de vérification à 6 chiffres a été envoyé à votre adresse email
                        </p>
                    </div>

                    <!-- Formulaire -->
                    <form id="verification-form" class="space-y-6">
                        <div class="space-y-2">
                            <label for="verification_code" class="block text-sm font-medium text-gray-700">
                                Code de vérification
                            </label>
                            <input 
                                type="text" 
                                id="verification_code" 
                                name="code" 
                                placeholder="000000"
                                maxlength="6"
                                required
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ease-in-out placeholder-gray-400"
                                autocomplete="one-time-code"
                            >
                        </div>

                        <button 
                            type="submit" 
                            id="VerifCode-button"
                            class="w-full bg-black hover:bg-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span class="flex items-center justify-center">
                                <svg class="hidden animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Vérifier le code
                            </span>
                        </button>
                    </form>

                    <!-- Zone de statut -->
                    <div id="verification-status" class="mt-4 text-center"></div>   
                </div>

                <!-- Footer informatif -->
                <div class="text-center">
                    <p class="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                        Ce code expire dans 10 minutes. Si vous rencontrez des difficultés, just retry !
                    </p>
                </div>
            </div>
        </div>
    `;
    //console.log("DEUXIEME CHECK POINT");
    const VerifForm = document.getElementById("verification-form") as HTMLFormElement;
    const submitButton = document.getElementById("VerifCode-button") as HTMLButtonElement;
    const statusDiv = document.getElementById("verification-status") as HTMLDivElement;
    const codeInput = document.getElementById("verification_code") as HTMLInputElement;

    // Animation d'entrée du code
    codeInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        target.value = target.value.replace(/\D/g, '');
        
        if (target.value.length === 6) {
            target.classList.add('ring-2', 'ring-green-500', 'border-green-500');
            target.classList.remove('border-gray-300');
        } else {
            target.classList.remove('ring-2', 'ring-green-500', 'border-green-500');
            target.classList.add('border-gray-300');
        }
    });

    if (VerifForm) {
        //console.log("TROISIEME CHECKPOITN");
        VerifForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            // Animation du bouton
            const spinner = submitButton.querySelector('svg');
            const buttonText = submitButton.querySelector('span');
            
            submitButton.disabled = true;
            spinner?.classList.remove('hidden');
            if (buttonText) buttonText.textContent = 'Vérification...';

            const Usercode = (event.target as HTMLFormElement).code.value;
            //console.log("QUATRIEME CHECKPOINT");
            try {
                const User = await userApi.TwoFAlogin({ Usercode, userID });
                //console.log("EST CE QUE JE SUIS ICI PSL");
                //console.log(User);
                
                // Animation de succès
                statusDiv.innerHTML = `
                    <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div class="flex items-center">
                            <svg class="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            <p class="text-sm text-green-700 font-medium">Vérification réussie !</p>
                        </div>
                    </div>
                `;

                authService.setAccessToken(User.AccessToken);
                await connectWebSocket();
                await renderNavBar();
                router.navigate('/home');
                return (User);
                
            } catch (err) {
                // Animation d'erreur
                statusDiv.innerHTML = `
                    <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div class="flex items-center">
                            <svg class="h-5 w-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <p class="text-sm text-red-700 font-medium">Code incorrect. Veuillez réessayer.</p>
                        </div>
                    </div>
                `;
                
                // Réinitialiser le bouton
                submitButton.disabled = false;
                spinner?.classList.add('hidden');
                if (buttonText) buttonText.textContent = 'Vérifier le code';
                
                // Animation shake pour l'input
                codeInput.classList.add('animate-pulse');
                setTimeout(() => {
                    codeInput.classList.remove('animate-pulse');
                    codeInput.focus();
                    codeInput.select();
                }, 500);
            }
        });
    }
}