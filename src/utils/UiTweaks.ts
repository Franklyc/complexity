import CplxUserSettings from "@/cplx-user-settings/CplxUserSettings";
import Canvas from "@/utils/Canvas";
import DomObserver from "@/utils/DomObserver/DomObserver";
import UiUtils from "@/utils/UiUtils";
import { getCookie, jsonUtils, setCookie, whereAmI } from "@/utils/utils";

export default class UiTweaks {
  static injectCustomStyles() {
    $(document.body).addClass("!tw-mr-0");

    const { customCSS, accentColor, monoFont, uiFont } =
      CplxUserSettings.get().customTheme;

    if ($("#complexity-custom-styles").length) {
      $("#complexity-custom-styles").text(jsonUtils.safeParse(customCSS || ""));
      return;
    }

    $("<style>")
      .attr({
        id: "complexity-custom-styles",
      })
      .text(jsonUtils.safeParse(customCSS || ""))
      .appendTo("head");

    type CustomTheme = {
      "--ui-font"?: string;
      "--mono-font"?: string;
      "--accent-foreground"?: string;
      "--accent-foreground-darker"?: string;
      "--ring"?: string;
      "--ring-darker"?: string;
      "--selection"?: string;
    };

    const css: CustomTheme = {
      "--ui-font": uiFont,
      "--mono-font": monoFont,
      "--accent-foreground": accentColor,
      "--accent-foreground-darker": `${accentColor}80`,
      "--ring": accentColor,
      "--ring-darker": `${accentColor}80`,
      "--selection": `${accentColor}60`,
    };

    if (!uiFont) delete css["--ui-font"];
    if (!monoFont) delete css["--mono-font"];
    if (!accentColor) {
      delete css["--accent-foreground"];
      delete css["--accent-foreground-darker"];
      delete css["--ring"];
      delete css["--ring-darker"];
      delete css["--selection"];
    }

    $(document.body).css(css);
  }

  static correctColorScheme() {
    const callback = () => {
      // cloudflare
      if (document.title === "Just a moment...") {
        $("html").addClass("dark tw-dark");
      }

      const darkTheme = UiUtils.isDarkTheme();

      if (darkTheme) $("html").addClass("dark tw-dark");
      else $("html").removeClass("dark tw-dark");

      // downtime page
      if (document.title === "We'll be right back") {
        $("html").addClass("dark tw-dark");
        $("h1").addClass("!tw-text-[4rem]");
        $("p.message").addClass("tw-font-sans");
      }
    };

    callback();

    DomObserver.create("htmlColorSchemeObserver", {
      config: {
        attributes: true,
        attributeFilter: ["data-color-scheme"],
        childList: false,
        subtree: false,
      },
      target: $("html")[0],
      onAttrChange: callback,
    });
  }

  static forceUSInterface() {
    if (
      getCookie("pplx.chosen-locale") != null &&
      getCookie("pplx.chosen-locale") !== "en-US"
    ) {
      setCookie("pplx.chosen-locale", "", -1);
      window.location.reload();
    }
  }

  static applySettingsAsHTMLAttrs(location: ReturnType<typeof whereAmI>) {
    const settings = CplxUserSettings.get().generalSettings;

    $(document.body)
      .toggleClass(
        "alter-attach-button",
        settings.queryBoxSelectors.spaceNFocus,
      )
      .toggleClass(
        "collapse-empty-thread-visual-columns",
        settings.visualTweaks.collapseEmptyThreadVisualColumns &&
          location === "thread",
      )
      .toggleClass(
        "custom-markdown-block",
        settings.qolTweaks.customMarkdownBlock && location === "thread",
      )
      .toggleClass(
        "cplx-canvas",
        settings.qolTweaks.customMarkdownBlock &&
          settings.qolTweaks.canvas.enabled,
      );

    (function setMaskableMarkdownBlocks() {
      if ($(document.body).attr("data-maskable-md-blocks")) return;

      const maskableLangs = settings.qolTweaks.canvas.mask;

      const dataString = Object.entries(maskableLangs)
        .filter(([lang, maskable]) => maskable && Canvas.isCanvasLang(lang))
        .map(([lang]) => lang)
        .join(" ");

      if (dataString) {
        $(document.body).attr(`data-maskable-md-blocks`, dataString);
      }
    })();
  }

  static applySelectableAttrs(location: ReturnType<typeof whereAmI>) {
    if (location !== "thread") return;

    UiUtils.getMessageBlocks();
  }
}
