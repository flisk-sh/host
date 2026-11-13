// The free places a fleetd pod host can run, as checked on 2026-11-13 from each vendor's public page and our own tries.
// status: use = proven to work with no card (none yet); card = free but wants a card; paid = needs a paid plan;
//         limited = free but it stops or runs out; unchecked = not tested by us.
export const CHECKED = '2026-11-13';

export const HOSTS = [
  {
    id: 'huggingface',
    name: 'Hugging Face Space',
    status: 'paid',
    size: 'Docker Spaces (greyed out on a new account)',
    card: false,
    why: 'A Space has a public https address, so fleet could call one with no tunnel. That is why we looked, but see the catch.',
    catch: 'On a new free account on 2026-11-13 the Docker option and CPU Basic hardware were greyed out with a "Paid" badge, so we could not make one. Static and Gradio Spaces are free but cannot run fleetd.',
    url: 'https://huggingface.co/new-space',
  },
  {
    id: 'oracle',
    name: 'Oracle Always Free',
    status: 'card',
    size: 'up to 4 Arm CPUs, 24 GB (vendor figure, may be lower in your region)',
    card: true,
    why: 'The biggest free machine. A whole VM, so Docker and gVisor work and pods can be isolated.',
    catch: 'Asks for a card to check who you are, and capacity can be tight.',
    url: 'https://www.oracle.com/cloud/free/',
  },
  {
    id: 'render',
    name: 'Render free web service',
    status: 'limited',
    size: '0.1 vCPU, 512 MB',
    card: false,
    why: 'Easy to deploy from a Dockerfile.',
    catch: 'Our free hours ran out on 2026-11-12, and it sleeps after 15 minutes idle.',
    url: 'https://render.com',
  },
  {
    id: 'koyeb',
    name: 'Koyeb free web service',
    status: 'card',
    size: '0.1 vCPU, 512 MB, 2 GB disk, Frankfurt or Washington D.C.',
    card: true,
    why: 'One free web service per organisation that runs a container image.',
    catch: 'Needs a credit card: Koyeb puts a $29 hold on it to prevent abuse (read on its pricing FAQ, 2026-11-13). The free machine is also very small.',
    url: 'https://www.koyeb.com/docs/faqs/pricing',
  },
  {
    id: 'fly',
    name: 'Fly.io',
    status: 'card',
    size: 'small VMs',
    card: true,
    why: 'Fast to start, many regions.',
    catch: 'Needs a card before any machine is created.',
    url: 'https://fly.io',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Containers',
    status: 'paid',
    size: 'container sizes',
    card: true,
    why: 'Runs next to fleet.',
    catch: 'Needs the paid Workers plan.',
    url: 'https://developers.cloudflare.com/containers/',
  },
];

export const LABEL = {
  use: 'Use this',
  card: 'Needs a card',
  paid: 'Paid',
  limited: 'Limited',
  unchecked: 'Not tried',
};
