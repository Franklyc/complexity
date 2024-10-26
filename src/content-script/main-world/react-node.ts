import { LanguageModel } from "@/content-script/components/QueryBox";
import { webpageMessenger } from "@/content-script/main-world/webpage-messenger";
import { mainWorldExec, mainWorldOnly } from "@/utils/hof";
import { getReactFiberKey, getReactPropsKey, jsonUtils } from "@/utils/utils";

export type ReactNodeAction = keyof typeof actions;
export type ReactNodeActionReturnType = {
  [K in ReactNodeAction]: ReturnType<(typeof actions)[K]>;
};

export type PplxThreadMessageReactFiberResult = {
  answer: string;
  web_results: {
    name: string;
    url: string;
  }[];
};

const actions = {
  getCodeFromPreBlock: mainWorldOnly((pre: Element): string => {
    return (pre as any)[getReactFiberKey(pre)]?.memoizedProps?.children[0]
      ?.props?.children[0];
  }),
  getMessageData: mainWorldOnly(
    (messageBlock: Element): PplxThreadMessageReactFiberResult => {
      const result = jsonUtils.safeParse(
        (messageBlock as any)[getReactFiberKey(messageBlock)]?.memoizedProps
          ?.children?.props?.result?.text,
      );

      return Array.isArray(result)
        ? jsonUtils.safeParse(result[result.length - 1]?.content?.answer)
        : result;
    },
  ),
  getMessageDisplayModel: mainWorldOnly(
    (messageBlock: Element): LanguageModel["code"] => {
      return (messageBlock as any)[getReactFiberKey(messageBlock)]
        ?.memoizedProps.children.props.result.display_model;
    },
  ),
  getMessageBackendUuid: mainWorldOnly((messageBlock: Element): string => {
    return (messageBlock as any)[getReactPropsKey(messageBlock)]?.children
      ?.props?.result?.backend_uuid;
  }),
} as const;

mainWorldExec(() => {
  webpageMessenger.onMessage(
    "getReactNodeData",
    async ({ payload: { querySelector, action } }) => {
      const $node = $(querySelector);

      if (!$node.length) return;

      return actions[action]($node[0]);
    },
  );
})();
