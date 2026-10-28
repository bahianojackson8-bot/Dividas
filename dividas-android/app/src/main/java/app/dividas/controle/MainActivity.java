package app.dividas.controle;

import android.app.Activity;
import android.os.Bundle;
import android.net.Uri;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.view.WindowManager;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.customtabs.CustomTabColorSchemeParams;

/** Opens the Google-account edition in the browser's integrated tab. */
public final class MainActivity extends Activity {
    private static final String ACCOUNT_URL = "https://meus-cartoes-familia-221026.sunset-spark-8281.chatgpt.site/";
    private TextView status;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        int padding = Math.round(28 * getResources().getDisplayMetrics().density);
        layout.setPadding(padding, padding * 2, padding, padding);
        layout.setBackgroundColor(0xff11141d);
        layout.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(padding + insets.getSystemWindowInsetLeft(), padding * 2 + insets.getSystemWindowInsetTop(),
                padding + insets.getSystemWindowInsetRight(), padding + insets.getSystemWindowInsetBottom());
            return insets;
        });
        TextView title = new TextView(this);
        title.setText("Dívidas");title.setTextSize(32);title.setTextColor(0xfff4f1ff);layout.addView(title);
        status = new TextView(this);
        status.setText("Entre com sua conta Google para acessar seus lançamentos. É preciso internet.");
        status.setTextSize(17);status.setTextColor(0xffd1cbde);status.setPadding(0,padding,0,padding);layout.addView(status);
        Button login = new Button(this);login.setText("Entrar com Google");
        login.setOnClickListener(view -> openAccount());layout.addView(login);
        setContentView(layout);
        if (state == null) openAccount();
    }
    private void openAccount() {
        try {
            new CustomTabsIntent.Builder()
                .setDefaultColorSchemeParams(new CustomTabColorSchemeParams.Builder().setToolbarColor(0xff11141d).build())
                .setColorScheme(CustomTabsIntent.COLOR_SCHEME_DARK)
                .setShowTitle(true).build().launchUrl(this, Uri.parse(ACCOUNT_URL));
        } catch (Exception ignored) {
            status.setText("Não foi possível abrir. Instale ou atualize um navegador, como Chrome, e tente novamente.");
        }
    }
}
