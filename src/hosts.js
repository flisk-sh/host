// The free places a fleetd pod host can run, as checked on 2026-11-13 from each vendor's public page and our own tries.
// status: use = works with no card and fleetd's rules; card = free but wants a card; paid = needs a paid plan;
//         limited = free but it stops or runs out; unchecked = not tested by us; no = against the vendor's rules, do not.
export const CHECKED = '2026-11-13';

export const HOSTS = [
  {
    id: 'huggingface',
    name: 'Hugging Face Space',
    status: 'use',
    size: '2 vCPU, 16 GB, Docker',
    card: false,
    why: 'Free with no card. It has a public https address, so fleet can call it with no tunnel and no machine of yours.',
    catch: 'Sleeps when idle. Pods share one container, so trusted code only.',
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
    name: 'Koyeb free instance',
    status: 'unchecked',
    size: 'small',
    card: null,
    why: 'Offers a free web service.',
    catch: 'We have not tried it. Check their page for card rules and limits first.',
    url: 'https://www.koyeb.com',
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
  {
    id: 'github-actions',
    name: 'GitHub Actions',
    status: 'no',
    size: '2 vCPU, 7 GB, one job',
    card: false,
    why: 'Free minutes on public repos and a fresh VM per job.',
    catch: "Not allowed: GitHub's terms forbid using Actions as general compute, and it would put the whole flisk-sh org at risk. A job also takes 10 to 30 s to start.",
    url: 'https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#actions',
  },
];

export const LABEL = {
  use: 'Use this',
  card: 'Needs a card',
  paid: 'Paid',
  limited: 'Limited',
  unchecked: 'Not tried',
  no: 'Not allowed',
};
