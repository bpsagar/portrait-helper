import Image from "next/image";
import Link from "next/link";
import logo from "../../public/references/logo.svg";

const LogoWithTitle = () => {
  return (
    <>
      <Link href="/">
        <Image src={logo} alt="Logo" width={48} height={48} />
      </Link>
      <h1 className="text-xl font-bold font-sans">
        Portrait.
        <span className="text-xl text-slate-500 font-sans tracking-[0]">
          Coach
        </span>
      </h1>
    </>
  );
};

export default LogoWithTitle;
