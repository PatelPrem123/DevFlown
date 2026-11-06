import React, { useState } from 'react';
import { X, Check, ShieldCheck, CreditCard, Sparkles, Zap, Building2, Tag } from 'lucide-react';

export default function CheckoutModal({ isOpen, onClose, selectedPlan, billingCycle = 'monthly', onPlanActivated }) {
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  if (!isOpen || !selectedPlan) return null;

  const basePrice = billingCycle === 'annual'
    ? selectedPlan.annualPrice
    : selectedPlan.monthlyPrice;

  const discountAmount = promoApplied ? (basePrice * promoDiscount) : 0;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  const handleApplyPromo = (e) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'DEVFLOW50' || promoCode.trim().toUpperCase() === 'LAUNCH50') {
      setPromoApplied(true);
      setPromoDiscount(0.5);
    } else if (promoCode.trim().toUpperCase() === 'STARTFREE') {
      setPromoApplied(true);
      setPromoDiscount(1.0);
    } else {
      alert('Invalid Promo Code. Try "DEVFLOW50" for 50% off!');
    }
  };

  const handleSubscribe = async () => {
    setIsProcessing(true);
    // Simulate commercial SaaS payment gateway authorization
    setTimeout(() => {
      setIsProcessing(false);
      setOrderComplete(true);
      if (onPlanActivated) {
        onPlanActivated(selectedPlan.id);
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {orderComplete ? 'Subscription Confirmed!' : `Subscribe to ${selectedPlan.name}`}
              </h3>
              <p className="text-xs text-slate-500">Commercial SaaS Checkout & Instant Provisioning</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {orderComplete ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Welcome to {selectedPlan.name}!</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Your subscription is active. All premium features including unlimited sprints, real-time collaboration, and webhook automation are unlocked.
            </p>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 transition active:scale-95"
              >
                Go to Workspace Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Order Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">Plan Tier</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedPlan.name} ({billingCycle})</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">Base Price</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">${basePrice.toFixed(2)} USD</span>
              </div>
              {promoApplied && (
                <div className="flex justify-between items-center text-xs text-emerald-600 font-semibold">
                  <span>Promo Discount ({(promoDiscount * 100).toFixed(0)}% off)</span>
                  <span>-${discountAmount.toFixed(2)} USD</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Total Billed Today</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">${finalPrice.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Promo Code Form */}
            <form onSubmit={handleApplyPromo} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Promo code (e.g. DEVFLOW50)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  disabled={promoApplied}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={promoApplied || !promoCode.trim()}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                {promoApplied ? 'Applied' : 'Apply'}
              </button>
            </form>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border flex items-center gap-2 font-semibold transition ${
                    paymentMethod === 'card'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Credit Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('github')}
                  className={`p-3 rounded-xl border flex items-center gap-2 font-semibold transition ${
                    paymentMethod === 'github'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>GitHub Sponsor</span>
                </button>
              </div>
            </div>

            {/* Security Guarantee */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>256-bit encrypted checkout. 14-day money-back satisfaction guarantee.</span>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? 'Processing Payment...' : `Complete Order — $${finalPrice.toFixed(2)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
