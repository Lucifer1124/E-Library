const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-10 text-slate-700">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em]" style={{ color: "#8672FF" }}>
            Bookie Pookie
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Local-first bookstore workflow</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Bookie Pookie is a local-first bookstore workflow, It allows users to browse and purchase books while maintaining a seamless experience even when offline.
          </p>
        </div>

        <div className="text-sm text-slate-500">
          <p>Sessions for 5 days.</p>
          <p>All payments supported: Demo Card and Cash on Delivery add Online Payment </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
