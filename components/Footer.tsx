'use client';

import { Mail, Globe, MapPin, Instagram, ExternalLink, Users, Award, Code2, Brain, Palette, Briefcase, ChevronRight, Server, Shield, Box, GitBranch } from 'lucide-react';

interface TeamMember {
  name: string;
  role: string;
  image: string;
  isCEO?: boolean;
  badge?: string;
}

const teamMembers: TeamMember[] = [
  {
    name: 'Luís Lutchi',
    role: 'CEO & Founder',
    image: '/transcritor-les/team/ceo.jpg',
    isCEO: true,
    badge: 'Liderança Executiva',
  },
  {
    name: 'João Silva',
    role: 'Desenvolvedor Principal',
    image: '/transcritor-les/team/member1.jpg',
  },
  {
    name: 'Maria Santos',
    role: 'Engenheira de IA',
    image: '/transcritor-les/team/member2.jpg',
  },
  {
    name: 'Pedro Costa',
    role: 'UI/UX Designer',
    image: '/transcritor-les/team/member3.jpg',
  },
  {
    name: 'Ana Ferreira',
    role: 'Gestora de Operações',
    image: '/transcritor-les/team/member4.jpg',
  },
  {
    name: 'Carlos Mendes',
    role: 'Arquiteto de Software',
    image: '/transcritor-les/team/member5.jpg',
  },
  {
    name: 'Juliana Rocha',
    role: 'DevOps Engineer',
    image: '/transcritor-les/team/member6.jpg',
  },
  {
    name: 'Ricardo Alves',
    role: 'Especialista em Segurança',
    image: '/transcritor-les/team/member7.jpg',
  },
  {
    name: 'Fernanda Lima',
    role: 'Product Manager',
    image: '/transcritor-les/team/member8.jpg',
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 bg-background/50 backdrop-blur-sm">
      {/* Seção Galeria da Equipe */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-4">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Nossa Equipe Executiva</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Conheça a equipe responsável pelas soluções tecnológicas da LES
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Uma equipe multidisciplinar apaixonada por inovação, inteligência artificial e desenvolvimento de software de ponta.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {teamMembers.map((member, index) => (
            <article
              key={member.name}
              className={`relative group rounded-2xl overflow-hidden transition-all duration-500 ${
                member.isCEO
                  ? 'bg-gradient-to-b from-indigo-950/40 to-slate-900 border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                  : 'glass border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5'
              }`}
            >
              {/* Card do CEO - Destaque Especial */}
              {member.isCEO && (
                <>
                  {/* Anel decorativo superior */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-2xl opacity-30 -translate-y-1/2" />
                </>
              )}

              {/* Imagem do Perfil */}
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Overlay gradiente */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Info do Membro */}
              <div className="p-6 relative z-10">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-foreground mb-1">{member.name}</h3>
                  <p className="text-sm text-primary font-medium mb-3">{member.role}</p>

                  {member.isCEO && (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Award className="w-3.5 h-3.5 text-yellow-400" />
                    </div>
                  )}

                  {/* Ícone da área de atuação para não-CEOs */}
                  {!member.isCEO && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        {member.role.includes('Desenvolvedor') && <Code2 className="w-3.5 h-3.5" />}
                        {member.role.includes('IA') && <Brain className="w-3.5 h-3.5" />}
                        {member.role.includes('UI/UX') && <Palette className="w-3.5 h-3.5" />}
                        {member.role.includes('Operações') && <Briefcase className="w-3.5 h-3.5" />}
                        {member.role.includes('Arquiteto') && <Box className="w-3.5 h-3.5" />}
                        {member.role.includes('DevOps') && <Server className="w-3.5 h-3.5" />}
                        {member.role.includes('Segurança') && <Shield className="w-3.5 h-3.5" />}
                        {member.role.includes('Product') && <GitBranch className="w-3.5 h-3.5" />}
                        <span className="font-medium text-foreground/70">Especialista</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Divisória decorativa */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-background/50 text-muted-foreground/50">Lutchi Enterprise Systems</span>
          </div>
        </div>
      </div>

      {/* Seção Canais de Contato e Info Corporativa */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {/* Coluna 1: Sobre a Empresa */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                              src="/transcritor-les/icons/logotipo.jpg"
                              alt="Lutchi Enterprise Systems"
                              className="w-10 h-10 rounded-xl object-cover"
                            />
              <div>
                <h3 className="text-lg font-bold text-foreground">Lutchi Enterprise Systems</h3>
                <p className="text-xs text-muted-foreground">(LES)</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Referência em inovação tecnológica, a LES desenvolve soluções de software, automação e inteligência artificial
              que transformam negócios e impulsionam a transformação digital em Angola e além.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/30">
              <MapPin className="w-3.5 h-3.5" />
              <span>Luanda, Angola</span>
            </div>
          </div>

          {/* Coluna 2: Canais Oficiais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Canais Oficiais
            </h3>
            <div className="space-y-3">
              <a
                href="mailto:les.angola@outlook.com"
                className="flex items-center gap-3 p-3 glass rounded-lg hover:bg-secondary/50 hover:border-primary/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">E-mail Corporativo</p>
                  <p className="text-xs text-muted-foreground group-hover:text-primary/80 transition-colors">les.angola@outlook.com</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
              </a>

              <a
                href="https://lutchi.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 glass rounded-lg hover:bg-secondary/50 hover:border-primary/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Website Oficial</p>
                  <p className="text-xs text-muted-foreground group-hover:text-primary/80 transition-colors">lutchi.vercel.app</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
              </a>

              <div className="flex items-center gap-3 p-3 glass rounded-lg">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Sede Física</p>
                  <p className="text-xs text-muted-foreground">Luanda, Angola</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 3: Redes e Presença Digital */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Instagram className="w-5 h-5" />
              Presença Digital
            </h3>
            <div className="space-y-3">
              <a
                href="https://instagram.com/les.systems"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 glass rounded-lg hover:bg-secondary/50 hover:border-pink-500/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Instagram className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Instagram</p>
                  <p className="text-xs text-muted-foreground group-hover:text-pink-400 transition-colors">@les.systems</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-pink-400 transition-colors" />
              </a>

              <a
                href="https://lutchi.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 glass rounded-lg hover:bg-secondary/50 hover:border-primary/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Website Corporativo</p>
                  <p className="text-xs text-muted-foreground group-hover:text-primary/80 transition-colors">lutchi.vercel.app</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>

              <a
                href="https://github.com/lutchi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 glass rounded-lg hover:bg-secondary/50 hover:border-gray-400/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-gray-200 group-hover:bg-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">GitHub</p>
                  <p className="text-xs text-muted-foreground group-hover:text-gray-300 transition-colors">@lutchi</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-gray-300 transition-colors" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Copyright */}
      <div className="border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-muted-foreground/70">
            © {currentYear} Lutchi Enterprise Systems (LES). Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}