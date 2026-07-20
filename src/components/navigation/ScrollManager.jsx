import { useEffect } from "react";
import {
  useLocation,
  useNavigationType,
} from "react-router-dom";

export default function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const chave = `scroll:${location.pathname}`;
    const deveRestaurar =
      navigationType === "POP" &&
      sessionStorage.getItem(chave) !== null;

    if (deveRestaurar) {
      const posicao = Number(
        sessionStorage.getItem(chave)
      );

      requestAnimationFrame(() => {
        window.scrollTo({
          top: posicao,
          behavior: "auto",
        });
      });

      return;
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [
    location.pathname,
    location.search,
    navigationType,
  ]);

  useEffect(() => {
    const salvarPosicao = () => {
      sessionStorage.setItem(
        `scroll:${location.pathname}`,
        String(window.scrollY)
      );
    };

    window.addEventListener(
      "scroll",
      salvarPosicao,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        salvarPosicao
      );
    };
  }, [location.pathname]);

  return null;
}