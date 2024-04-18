/** @jsxImportSource frog/jsx */

import { Button, Frog, TextInput } from 'frog'
import { devtools } from 'frog/dev'
import { neynar as hub_neynar } from 'frog/hubs'
import { neynar } from "frog/middlewares";
import { handle } from 'frog/next'
import { serveStatic } from 'frog/serve-static'

const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
  initialState: {
    saved: false,
  },
  hub: hub_neynar({ apiKey: `${process.env.NEYNAR_API_KEY}` }),
});
/* .use(
  neynar({
    apiKey: `${process.env.NEYNAR_API_KEY}`,
    features: ["interactor", "cast"],
  })
); */

// Uncomment to use Edge Runtime
// export const runtime = 'edge'

const neynarMiddleware = neynar({
  apiKey: `${process.env.NEYNAR_API_KEY}`,
  features: ['interactor', 'cast'],
})

app.frame('/', (c) => {
  return c.res({
    image: '/1.png',
    intents: [
      <Button.AddCastAction
        action="/rank-action"
        name="Get Global Rank"
        icon="log"
      >
        Add
      </Button.AddCastAction>,
    ],
  })
})

app.castAction("/rank-action", neynarMiddleware, async (c) => {
  if (c.verified) {
    //const fid = c.actionData.fid;
    const username = c.var.interactor?.displayName;

    const response = await fetch('https://graph.cast.k3l.io/scores/global/following/handles', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([username])
    })

    if (!response.ok) {
      return c.res({ message: 'Failed to call Openrank API' });
    }

    const data = await response.json()
    console.log('data', data);

    return c.res({ message: data });
  } else {
    return c.res({ message: "Unauthorized" });
  }
});

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
