import Index from "./pages/Index";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

export const routers = [
    {
      path: "/",
      name: 'home',
      element: <Index />,
    },
    {
      path: "/admin",
      name: 'admin',
      element: <Admin />,
    },
    /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
    {
      path: "*",
      name: '404',
      element: <NotFound />,
    },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
