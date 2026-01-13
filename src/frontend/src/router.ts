interface App {
    navigate: (path: string) => void;
    render : (component : string, params? : string | null) => void;
}

interface Route{
    path: string;
    component: string;
    param? : string;
}

const routes: Route[] = [
    {path: '/home', component: 'home'},
    {path: '/register', component: 'register'},
    {path: '/login', component: 'login'},
    {path: '/game', component: 'game'},
    {path: '/tournament', component: 'tournament'},
    {path: '/profil', component: 'profil'},
    {path: '/chat', component: 'chat'},
    {path: '/friendlist', component: 'friendlist'},
    {path: '/settings', component: 'settings'},
    {path: '/twofa', component: 'twofa'},
    {path: '*', component: 'not-found'}
];

export class Router {
    private app : App | null = null;


    init(app : App): void {
        this.app = app;

        document.addEventListener('click', (event) =>{
            const target = event.target as HTMLElement;
            const anchor = target.closest('a');

            if(anchor && anchor.href.startsWith(window.location.origin)){
                event.preventDefault();
                const path = anchor.pathname;
                this.navigate(path);
            }
        });

        window.addEventListener('popstate', () =>{
            const path = window.location.pathname;
            //console.log(`popstate path= ${path}`);
            const route = this.navigate(path, false);
        });
         
        app.navigate = this.navigate.bind(this);

        //navigate to the actual URL
        const path = window.location.pathname;
        const route = this.navigate(path);
    }

    private findRoute(path: string): Route{
        //console.log(`findRoute path = ${path}`);
        const route = routes.find(route => route.path === path);
        return route || routes.find(route => route.path === '*')!;
    }

    navigate(path: string, addToHistory : boolean = true): void{
        if(!this.app){
            console.error('Router not initialized');
            return;
        }
        if(path === '/'){
            path = '/home';
        }
        //console.log(`router navigate path ${path}`);
        const parts = path.split('/').filter(Boolean); // Ex: ['profil', '42']
        const baseRoute = parts[0];
        const param = parts[1] || null;
        //console.log(`baseRoute ${baseRoute}`);
        const route = this.findRoute('/' + baseRoute);
        //console.log(`param = ${param}`);
        //console.log(`route = ${route.component}`);
        
        if(addToHistory){
            window.history.pushState({}, '', path);
        }

        this.app.render(route.component, param);
    }
    setOldPath() : void {
        window.history.pushState({}, '', window.location.pathname);
    }
}

export const router = new Router();
