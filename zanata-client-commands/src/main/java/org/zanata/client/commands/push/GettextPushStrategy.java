package org.zanata.client.commands.push;

import static com.google.common.collect.Sets.newTreeSet;
import static org.apache.commons.io.FileUtils.listFiles;
import static org.apache.commons.io.FilenameUtils.removeExtension;

import java.io.File;
import java.util.Collection;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.zanata.client.config.LocaleList;
import org.zanata.client.config.LocaleMapping;

import com.google.common.collect.Lists;

public class GettextPushStrategy extends AbstractGettextPushStrategy
{
   private static final Logger log = LoggerFactory.getLogger(GettextPushStrategy.class);

   @Override
   List<LocaleMapping> findLocales()
   {
      // find all .po basenames in this dir and subdirs
      final LocaleList localeList = getOpts().getLocaleMapList();
      Collection<File> files = listFiles(
            getOpts().getTransDir(), new String[]{"po"}, true);
      Set<String> localeNames = newTreeSet();
      for (File f: files)
      {
         String localeName = removeExtension(f.getName());
         localeNames.add(localeName);
      }
      List<LocaleMapping> locales = Lists.newArrayList();
      for (String localeName: localeNames)
      {
         LocaleMapping localLocale;
         if (localeList != null)
         {
            localLocale = localeList.findByLocalLocale(localeName);
            if (localLocale == null)
            {
               log.warn("Skipping locale {}; no locale entry found in zanata.xml", localeName);
               continue;
            }
         }
         else
         {
            localLocale = new LocaleMapping(localeName);
         }
         locales.add(localLocale);
      }
      return locales;
   }

   @Override
   File getTransFile(LocaleMapping localeMapping, String docName)
   {
      String localLocale = localeMapping.getLocalLocale();
      File transDir = getOpts().getTransDir();
      File docDir = new File(transDir, docName).getParentFile();
      File transFile = new File(docDir, localLocale + ".po");
      return transFile;
   }

}