import { router } from "../router.js";

export function renderNotFound(mainElement : HTMLElement){
    const status = document.getElementById("status");
    if(status){
      status.innerHTML = "404 Not Found";
    }
    mainElement.innerHTML = `<div class="text-center px-4 max-w-2xl mx-auto">
                            <div class="mb-8">
                                <div class="relative inline-block">
                                    <div class="text-8xl md:text-9xl font-bold text-black opacity-80 select-none">
                                    404
                                    </div>
                                </div>  
                            </div>
                            <h1 class="text-3xl md:text-4xl font-bold text-white mb-4">
                            Page non trouvée
                            </h1>
                            <p class="text-custom-gray text-lg md:text-xl mb-8 leading-relaxed">
                            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
                            </p>
                             <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <button id="backhome" class="group relative px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full transition-all duration-300 transform hover:scale-105 flex items-center gap-2 shadow-lg hover:shadow-xl">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                                    </svg>
                                Retour à l'accueil
                                </button>
                            </div>  
                        </div>`
    const backHomeButton = document.getElementById('backhome');
    if(backHomeButton){
        backHomeButton.addEventListener('click', ()=>{
            router.navigate('/home')
        })
    }
}