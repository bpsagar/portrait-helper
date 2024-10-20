import Image from "next/image";
import Link from "next/link";
import logo from "../../public/references/logo.svg";

interface NavbarProps {
  name: string;
}

const Navbar: React.FC<NavbarProps> = ({ name }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-10 bg-white">
      <div className="container mx-auto px-4 py-2 flex items-center">
        <Link href="/">
          <Image src={logo} alt="Logo" width={48} height={48} />
        </Link>
        <h1 className="text-xl font-bold font-sans">Portrait of {name}</h1>
      </div>
    </nav>
  );
};

export default Navbar;
