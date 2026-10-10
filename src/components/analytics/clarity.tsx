export function Clarity({ projectId }: { projectId: string }) {
  if (!/^[a-zA-Z0-9]{1,64}$/.test(projectId)) return null;

  return (
    <script
      id="clarity-init"
      async
      dangerouslySetInnerHTML={{
        __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(projectId)});`,
      }}
    />
  );
}
