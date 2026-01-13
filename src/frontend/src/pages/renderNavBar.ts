import { authService }  from "../API/auth.js";
import { userApi }      from "../API/api.js";

interface LinkItemConfig {
  href?:      string;
  text:       string;
  type?:      string;
  onClick?:   (event: Event) => void | Promise<void>;
  isButton?:  boolean;
}

type  IconLinkOpts = {
  iconName:   string;
  href:       string;
  title?:     string;
};

export function createIconLink({ iconName, href, title }: IconLinkOpts): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = href;
  link.className = "inline-block text-white";
  link.title = title || iconName;

  const icon = document.createElement("span");
  icon.className = "nav-symbol text-2xl";
  icon.textContent = iconName;
  if(href === '/chat'){
    icon.id = 'chatbox-link';
  }

  link.append(icon);
  return link;
}

export async function renderNavBar(): Promise<void> {
  const nav = document.getElementById("navbar");
  if (!nav) return console.error("NavBar Element not found");

  nav.innerHTML = "";
  nav.className = "header";

  const makeLinkItem = ({ href, text, type = "a", onClick, isButton = false }: LinkItemConfig): HTMLLIElement => {
    const li = document.createElement("li");
    const el = isButton
      ? document.createElement("button") as HTMLButtonElement
      : document.createElement("a") as HTMLAnchorElement;

    if (isButton) {
      (el as HTMLButtonElement).type = "button";
    } else {
      (el as HTMLAnchorElement).href = href || "";
    }

    el.textContent = text.toUpperCase();
    if (onClick) el.addEventListener("click", onClick);
    el.className = isButton ? "btn" : "link";
    li.append(el);
    return li;
  };

  const left        = document.createElement("ul");
  const center      = document.createElement("div");
  const right       = document.createElement("ul");

  left.className    = "navbar public-navbar";
  center.className  = "nav-status";
  right.className   = "navbar public-navbar";

  left.append(
    makeLinkItem({ href: "/",     text: "Home" })
  );

  center.id = "status";
  center.className = "nav-status";
  center.textContent = ":)";

  const logged = await authService.isValid();
  //console.log(`is logged for navbar ${logged}`)

  if (!logged) {
    right.append(
      makeLinkItem({ href: "/register", text: "Register" }),
      makeLinkItem({ href: "/login", text: "Login" })
    );
  } else {
    right.className = "navbar private-navbar";
    right.append(
      createIconLink({ iconName: "smart_toy",       href: "/game",        title: "PonGPT-4o"  }),
      createIconLink({ iconName: "crown",           href: "/tournament",  title: "Tournament" })
    );

    right.append(
      createIconLink({ iconName: "sms",             href: "/chat",        title: "Live Chat"  }),
      createIconLink({ iconName: "settings",        href: "/settings",    title: "Settings"   })
    )

    try {
      const userId = await authService.getUserId();
      if (!userId) throw new Error("No userId returned");

      const userResponse = await userApi.getUserById(userId);
      //console.log(userResponse.user.avatar_url);

      const link = document.createElement("a");
      link.href = "/profil";
      link.title = "Profile";

      const avatar = document.createElement("img");
      if (!userResponse.user.avatar_url.startsWith('http')) {
        avatar.src = 'http://localhost:3000' + userResponse.user.avatar_url;
      } else {
        avatar.src = userResponse.user.avatar_url;
      }

      if (avatar.src.includes("alien-svgrepo-com.svg")) {
        avatar.className = "nav-avatar-default";
      } else {
        avatar.className = "nav-avatar-custom";
      }

      link.append(avatar);
      right.append(link);
      } catch (err) {
        //console.error("Error fetching user:", err);
    }
  }
  nav.append(left, center, right);
}
