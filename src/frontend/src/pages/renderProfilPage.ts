import { authService } from "../API/auth.js";
import { router } from "../router.js";
import { userApi } from "../API/api.js";
import { renderNavBar } from "./renderNavBar.js";
import { renderFriendList } from "./renderFriendList.js";

export async function renderProfilPage(mainElement : HTMLElement, profilId? : string | null){
  //console.log("renderprofilPage");    
  let matches = [];
  const status = document.getElementById("status");
  mainElement.innerHTML = `
  <div class="container mx-auto py-8 flex justify-center">
  <div class="loading-spinner"></div>
  <p class="ml-3">Chargement du profil...</p>
  </div>
  `;
    const logged = await authService.isValid();
    if (!logged){
        router.navigate('/home');
        return;
    }
  let userId : string | null;
  let isUser = true;
  userId = await authService.getUserId();
  if(!profilId || profilId == userId){
    isUser = true;
    if(!userId){
      //console.log("userId not found");
      router.navigate('/login');
      return;
    }
    if(status){
      status.innerHTML = "My Profil";
    }
  }
  else{
    userId = profilId;
    isUser = false; // faire un call api pour vérifier si l'utilisateur est un ami ou non
    if(status){
        status.innerHTML = "OTHER USER PROFIL";
    }
  }
  try{    
    history.replaceState(null, '', `/profil/${userId}`);
    const UserResponse = await userApi.getUserById(userId);
    const statsResponse = await userApi.getUserStats(userId);
    const matchResponse = await userApi.getMatchHistory(userId);
    // console.log(UserResponse);
    // console.log(statsResponse);
    // console.log(matchResponse);
    matches = matchResponse.matchHistory;
    const getOutcomeColor = (outcome : string) => {
      return outcome === 'VICTORY' ? 'text-green-400' : 'text-red-400';
    };
    const getCategoryColor = (category : string) => {
      switch (category) {
        case 'TOURNAMENT':
          return 'bg-orange-500';
        case 'PRACTICE':
          return 'bg-blue-500';
        case 'DUEL':
          return 'bg-gray-500';
        default:
          return 'bg-gray-500';
      }
    };
    const matchesHTML = matches.slice(0, 10).map((match) => `
      <div class="flex items-center space-x-8 text-sm">
        <span class="w-20 font-bold ${getOutcomeColor(match.outcome)}">
          ${match.outcome}
        </span>
        <span class="w-16 text-white font-mono">${match.score}</span>
        <span class="w-24 text-white">${match.opponent}</span>
        <span class="w-24">
          <span class="px-2 py-1 rounded text-xs text-white ${getCategoryColor(match.category)}">
            ${match.category}
          </span>
        </span>
        <span class="w-20 text-gray-400">${match.date}</span>
      </div>
    `).join('');

    const WinRatio = statsResponse.stats.games_played > 0 ? (statsResponse.stats.games_won / statsResponse.stats.games_played) * 100 : 0;
    mainElement.innerHTML = `
    <div class="profilDiv">
      <div class="profilleftPanel">
        <div class="mb-6 text-center">
          <img id="AvatarProfil" src="${UserResponse.user.avatar_url}" alt="Avatar :" class="w-32 h-32 rounded-full object-cover mx-auto">
        <div class="profilName mt-2">${UserResponse.user.username}</div>

        <div class="leftStatPanel bg-[rgba(0,0,0,0.9)]">
          <div class="flex justify-between items-center">
            <div class="flex flex-col">
              <span class="text-gray-300 font-medium uppercase tracking-wide">MATCHES</span>
            <div class="text-white font-bold text-base mb-1">${statsResponse.stats.games_played}</div>
            </div>

            <!-- Colonne droite -->
            <div class="space-y-0.5">
              <div class="flex items-center justify-end gap-2">
                <span class="text-green-400 text-xs uppercase">WON</span>
                <span class="text-white text-xs font-medium">${statsResponse.stats.games_won}</span>
                <span class="text-red-400 text-xs uppercase">LOST</span>
                <span class="text-white text-xs font-medium">${statsResponse.stats.games_played - statsResponse.stats.games_won}</span>
              </div>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <div class="flex flex-col">
              <span class="text-gray-300 text-xs font-medium uppercase tracking-wide">TOURNAMENTS</span>
                <div class="text-white font-bold text-base mb-1">${statsResponse.stats.tournaments_played}</div>
                </div>
                  <div class="space-y-0.5">
                    <div class="flex items-center justify-end gap-2">
                      <span class="text-green-400 text-xs uppercase">WON</span>
                      <span class="text-white text-xs font-medium">${statsResponse.stats.tournaments_won}</span>
                      <span class="text-red-400 text-xs uppercase">LOST</span>
                      <span class="text-white text-xs font-medium">${statsResponse.stats.tournaments_played - statsResponse.stats.tournaments_won}</span>
                    </div>
                </div>
              </div>
          <div class="flex justify-between items-start">
            <span class="text-gray-300 text-xs font-medium uppercase tracking-wide">MATCHES WINRATE</span>
                <div class="text-white font-bold text-base">${WinRatio.toFixed(0)}%</div>
            </div>
            </div>
          </div>
        </div>
      <div class="relative">
      <div class="flex-1 bg-[rgba(0,0,0,0.9)] rounded-lg">
        <div class=" px-6 py-3 rounded-t-lg">
          <div class="flex text-gray-300 text-sm font-bold space-x-8">
            <span class="w-20">OUTCOME</span>
            <span class="w-16">SCORE</span>
            <span class="w-24">OPPONENT</span>
            <span class="w-24">CATEGORY</span>
            <span class="w-20">DATE</span>
          </div>
        </div>
        
        <div class="p-6 space-y-3">
          ${matchesHTML}
        </div>
      </div>
      </div>
    <div id="corner-button">
      <button id="FriendListButton" class="Friendlistbtn bg-black">Friends</button>
    </div>
    </div>`;
    //console.log("deuxieme bonjour profil");

    
    const FriendListButton = document.getElementById("FriendListButton");
    if(FriendListButton){
      FriendListButton.addEventListener('click', async() => {
        router.navigate('/friendlist');
      })
    }
  }
  catch(err){
    //console.log(err);
  }
}


interface EditableOptions {
  placeholder?: string;
  maxLength?: number;
  editbutton: HTMLElement;
  onSave?: (newValue: string, element: HTMLElement) => void;
  onCancel?: (element: HTMLElement) => void;
}

class EditableText {
  private element: HTMLElement;
  private editbutton: HTMLElement;
  private originalText: string;
  private options: EditableOptions;
  private isEditing: boolean = false;

  constructor(element: HTMLElement, options: EditableOptions = {}) {
      this.element = element;
      this.originalText = Array.from(element.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent)
      .join('').trim();
      //console.log(this.originalText);
      this.editbutton = options.editbutton;
      this.options = options;
      this.element.style.cursor = 'pointer';
      //this.element.setAttribute('title', 'Cliquez pour modifier');
      this.editbutton.addEventListener('click', this.startEditing.bind(this));
  }

  private startEditing(): void {
      if (this.isEditing) return;
      
      this.isEditing = true;
      const currentText = this.originalText;
      
      // Créer l'input
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentText;
      input.className = this.element.className; // Conserver les styles
      
      if (this.options.placeholder) {
          input.placeholder = this.options.placeholder;
      }
      
      if (this.options.maxLength) {
          input.maxLength = this.options.maxLength;
      }

      // Événements de sauvegarde
      input.addEventListener('blur', () => this.saveEdit(input));
      input.addEventListener('keydown', (e: KeyboardEvent) => this.handleKeydown(e, input));

      // Remplacer l'élément par l'input
      this.element.style.display = 'none';
      this.element.parentNode?.insertBefore(input, this.element);
      input.focus();
      input.select();
  }

  private handleKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
      switch (event.key) {
          case 'Enter':
              event.preventDefault();
              this.saveEdit(input);
              break;
          case 'Escape':
              event.preventDefault();
              this.cancelEdit(input);
              break;
      }
  }

  private saveEdit(input: HTMLInputElement): void {
      const newValue = input.value.trim();
      
      // Mettre à jour le texte
      this.element.textContent = newValue || this.originalText;
      
      // Nettoyer
      this.cleanup(input);
      const editbutton = document.createElement('button');
      editbutton.textContent = 'Edit';
      editbutton.className = 'editbutton';
      editbutton.addEventListener('click', () => this.startEditing());
      this.element.appendChild(editbutton);

      
      // Callback de sauvegarde
      if (this.options.onSave) {
          this.options.onSave(newValue, this.element);
      }
  }

  private cancelEdit(input: HTMLInputElement): void {
      // Restaurer le texte original
      this.element.textContent = this.originalText;
      
      // Nettoyer
      this.cleanup(input);
      const editbutton = document.createElement('button');
      editbutton.textContent = 'Edit';
      editbutton.className = 'editbutton';
      editbutton.addEventListener('click', () => this.startEditing());
      this.element.appendChild(editbutton);
      
      // Callback d'annulation
      if (this.options.onCancel) {
          this.options.onCancel(this.element);
      }
  }

  private cleanup(input: HTMLInputElement): void {
      this.element.style.display = '';
      input.remove();
      this.isEditing = false;
      // Mettre à jour le texte original pour la prochaine édition
      this.originalText = this.element.textContent || '';
  }

  // Méthodes publiques
  public setValue(value: string): void {
      this.element.textContent = value;
      this.originalText = value;
  }

  public getValue(): string {
      return this.element.textContent || '';
  }

  public destroy(): void {
      this.element.removeEventListener('click', this.startEditing.bind(this));
      this.element.style.cursor = '';
      this.element.removeAttribute('title');
  }
}