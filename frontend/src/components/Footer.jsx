const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-12 text-slate-700">
      <div className="mx-auto max-w-screen-2xl">
        {/* Main Footer Content */}
        <div className="flex flex-col gap-8 md:flex-row md:justify-between md:items-start">
          
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "#8672FF" }}>
              Bookie Pookie
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              A local-first bookstore workflow
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              Built for seamless online reading logs, local sync, and personal digital archiving. Your library just stays yours....
            </p>
          </div>
          <div className="space-y-2 text-sm text-slate-500 md:text-right">
            <p className="font-medium text-slate-700">System Status</p>
            <p>Accepted: Demo Card, COD, and Online Payments.</p>
          </div>
          
        </div>

        <div className="mt-12 border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} Bookie Pookie. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#docs" className="hover:text-slate-600 transition-colors">Documentation</a>
            <a href="#privacy" className="hover:text-slate-600 transition-colors">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;