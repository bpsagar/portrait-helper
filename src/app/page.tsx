// write a landing page component here

export default function Page() {
  return (
    <div className="bg-ivory min-h-screen">
      <div className="container mx-auto text-center py-24 px-4">
        <h1 className="text-6xl font-medium tracking-tight">
          Yes, you can sketch a <br />
          <span className="text-mint-green">portrait</span> too!
        </h1>
        <p className="text-xl mt-10">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent
          euismod nisl vel ante aliquet, a auctor turpis convallis. Curabitur a
          ligula auctor, aliquam risus sed, dignissim dolor.
        </p>
        <div className="mt-10">
          <a className="btn-primary" href="#">
            Get started
          </a>
        </div>
      </div>
    </div>
  );
}
